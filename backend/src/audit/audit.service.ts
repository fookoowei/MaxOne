import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { getAuditContext } from './audit.context';
import type { AuditAction, AuditEntityType } from './audit.actions';

export interface AuditEntry {
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  /** Changed fields only — never a full row. See the spec §5. */
  oldValue: Prisma.InputJsonObject;
  newValue: Prisma.InputJsonObject;
}

/**
 * The only place `prisma.auditLog` is touched. Append-only by construction: there is no update
 * and no delete method, so no route can reach one.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes one audit row using the CALLER'S transaction client, so the entry lands in the same
   * transaction as the change it records: both commit, or neither does. Passing `this.prisma`
   * here instead of `tx` would silently break that guarantee — hence the test that asserts the
   * root client is never used.
   *
   * This is a local INSERT on a connection already held, costing microseconds — which is why it
   * belongs inside the transaction, while M4c's FX call (slow and external) had to stay outside.
   */
  async log(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    const { ipAddress, userAgent } = getAuditContext();
    await tx.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * One page of audit history, newest first. Filters are optional and AND-combined, serving both
   * real questions from one endpoint: "what did this actor do?" and "what happened to this entity?"
   */
  async findMany(filters: {
    actorId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    skip?: number;
    take?: number;
  }) {
    const skip = filters.skip ?? 0;
    // Capped so a single request cannot pull the entire table, exactly like GET /users.
    const take = Math.min(filters.take ?? 20, 100);

    const where: Prisma.AuditLogWhereInput = {
      ...(filters.actorId ? { actorUserId: filters.actorId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { total, skip, take, logs };
  }
}
