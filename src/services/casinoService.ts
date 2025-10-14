import { prisma } from '../db';
import type { Casino, Prisma } from '@prisma/client';
import type {
  RegistrationRequest,
  HeartbeatPayload,
  CasinoUpdateRequest,
  CasinoFilters,
  CasinoMetadata,
  GameType,
  CasinoStatus,
} from '../types';

export class CasinoService {
  /**
   * Register a new casino
   */
  async registerCasino(input: RegistrationRequest): Promise<CasinoMetadata> {
    // Check if casino already exists
    const existing = await prisma.casino.findUnique({
      where: { publicKey: input.publicKey },
    });

    if (existing) {
      throw new Error('CASINO_ALREADY_EXISTS');
    }

    const casino = await prisma.casino.create({
      data: {
        publicKey: input.publicKey,
        name: input.name,
        url: input.url,
        status: 'online',
        description: input.metadata.description,
        games: input.metadata.games || [],
        logo: input.metadata.logo,
        banner: input.metadata.banner,
        twitterUrl: input.metadata.socialLinks?.twitter,
        discordUrl: input.metadata.socialLinks?.discord,
        telegramUrl: input.metadata.socialLinks?.telegram,
        websiteUrl: input.metadata.socialLinks?.website,
        maxBetAmount: input.metadata.maxBetAmount,
        minBetAmount: input.metadata.minBetAmount,
        supportedTokens: input.metadata.supportedTokens || ['SOL'],
        version: '1.0.0',
      },
    });

    return this.formatCasinoResponse(casino);
  }

  /**
   * Update casino heartbeat
   */
  async updateHeartbeat(input: HeartbeatPayload): Promise<{ 
    success: boolean; 
    timestamp: number; 
    nextHeartbeatIn?: number;
  }> {
    const casino = await prisma.casino.findUnique({
      where: { id: input.casinoId },
    });

    if (!casino) {
      throw new Error('CASINO_NOT_FOUND');
    }

    // Create heartbeat record
    await prisma.heartbeat.create({
      data: {
        casinoId: casino.id,
        status: input.status,
        activePlayers: input.metrics?.activePlayers,
        totalBets24h: input.metrics?.totalBets24h,
        uptime: input.metrics?.uptime,
        responseTime: input.metrics?.responseTime,
        signature: input.signature,
        timestamp: new Date(input.timestamp),
      },
    });

    // Update casino status and last heartbeat
    await prisma.casino.update({
      where: { id: casino.id },
      data: {
        status: input.status,
        lastHeartbeat: new Date(input.timestamp),
      },
    });

    return {
      success: true,
      timestamp: Date.now(),
      nextHeartbeatIn: 60, // 60 seconds
    };
  }

  /**
   * Update casino metadata
   */
  async updateCasino(input: CasinoUpdateRequest): Promise<CasinoMetadata> {
    const casino = await prisma.casino.findUnique({
      where: { id: input.casinoId },
    });

    if (!casino) {
      throw new Error('CASINO_NOT_FOUND');
    }

    const updateData: Prisma.CasinoUpdateInput = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.url !== undefined) updateData.url = input.url;
    if (input.status !== undefined) updateData.status = input.status;
    
    if (input.metadata) {
      if (input.metadata.description !== undefined) {
        updateData.description = input.metadata.description;
      }
      if (input.metadata.games !== undefined) {
        updateData.games = input.metadata.games;
      }
      if (input.metadata.logo !== undefined) {
        updateData.logo = input.metadata.logo;
      }
      if (input.metadata.banner !== undefined) {
        updateData.banner = input.metadata.banner;
      }
      if (input.metadata.socialLinks) {
        if (input.metadata.socialLinks.twitter !== undefined) {
          updateData.twitterUrl = input.metadata.socialLinks.twitter;
        }
        if (input.metadata.socialLinks.discord !== undefined) {
          updateData.discordUrl = input.metadata.socialLinks.discord;
        }
        if (input.metadata.socialLinks.telegram !== undefined) {
          updateData.telegramUrl = input.metadata.socialLinks.telegram;
        }
        if (input.metadata.socialLinks.website !== undefined) {
          updateData.websiteUrl = input.metadata.socialLinks.website;
        }
      }
      if (input.metadata.maxBetAmount !== undefined) {
        updateData.maxBetAmount = input.metadata.maxBetAmount;
      }
      if (input.metadata.minBetAmount !== undefined) {
        updateData.minBetAmount = input.metadata.minBetAmount;
      }
      if (input.metadata.supportedTokens !== undefined) {
        updateData.supportedTokens = input.metadata.supportedTokens;
      }
    }

    const updated = await prisma.casino.update({
      where: { id: casino.id },
      data: updateData,
    });

    return this.formatCasinoResponse(updated);
  }

  /**
   * Get a single casino by ID
   */
  async getCasinoById(id: string): Promise<CasinoMetadata | null> {
    const casino = await prisma.casino.findUnique({
      where: { id },
    });
    
    return casino ? this.formatCasinoResponse(casino) : null;
  }

  /**
   * Get a single casino by public key
   */
  async getCasinoByPublicKey(publicKey: string): Promise<CasinoMetadata | null> {
    const casino = await prisma.casino.findUnique({
      where: { publicKey },
    });
    
    return casino ? this.formatCasinoResponse(casino) : null;
  }

  /**
   * Get list of casinos with filters
   */
  async getCasinos(filters: CasinoFilters): Promise<{
    casinos: CasinoMetadata[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const where: Prisma.CasinoWhereInput = {};
    
    if (filters.status !== undefined) {
      where.status = filters.status;
    }
    
    if (filters.games && filters.games.length > 0) {
      where.games = {
        hasSome: filters.games,
      };
    }

    const [casinos, total] = await Promise.all([
      prisma.casino.findMany({
        where,
        skip: filters.offset,
        take: filters.limit,
        orderBy: { lastHeartbeat: 'desc' },
      }),
      prisma.casino.count({ where }),
    ]);

    return {
      casinos: casinos.map(this.formatCasinoResponse),
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  /**
   * Mark inactive casinos (haven't sent heartbeat in configured time)
   */
  async markInactiveCasinos(timeoutMinutes: number): Promise<number> {
    const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000);
    
    const result = await prisma.casino.updateMany({
      where: {
        lastHeartbeat: { lt: cutoff },
        status: { not: 'offline' },
      },
      data: {
        status: 'offline',
      },
    });

    return result.count;
  }

  /**
   * Get casino statistics
   */
  async getStatistics() {
    const [total, online, recentHeartbeats] = await Promise.all([
      prisma.casino.count(),
      prisma.casino.count({ where: { status: 'online' } }),
      prisma.heartbeat.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    return {
      totalCasinos: total,
      onlineCasinos: online,
      heartbeatsLast24h: recentHeartbeats,
    };
  }

  /**
   * Format casino for API response (matches SDK CasinoMetadata)
   */
  private formatCasinoResponse(casino: Casino): CasinoMetadata {
    return {
      id: casino.id,
      name: casino.name,
      url: casino.url,
      publicKey: casino.publicKey,
      status: casino.status as CasinoStatus,
      metadata: {
        description: casino.description || undefined,
        games: casino.games as GameType[],
        logo: casino.logo || undefined,
        banner: casino.banner || undefined,
        socialLinks: {
          twitter: casino.twitterUrl || undefined,
          discord: casino.discordUrl || undefined,
          telegram: casino.telegramUrl || undefined,
          website: casino.websiteUrl || undefined,
        },
        maxBetAmount: casino.maxBetAmount || undefined,
        minBetAmount: casino.minBetAmount || undefined,
        supportedTokens: casino.supportedTokens,
      },
      createdAt: casino.createdAt.getTime(),
      updatedAt: casino.updatedAt.getTime(),
      lastHeartbeat: casino.lastHeartbeat?.getTime(),
      version: casino.version,
    };
  }
}

export const casinoService = new CasinoService();
