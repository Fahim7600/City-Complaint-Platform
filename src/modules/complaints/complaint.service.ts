import { ComplaintStatus, Priority, type Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../auth/auth.service";
import { createNotification } from "../notifications/notification.service";
import {
  getManagerDepartmentId,
  verifyComplaintAccess,
} from "./complaint.access";
import type {
  CreateComplaintInput,
  ListQueryInput,
  ReTriageInput,
  StatusUpdateInput,
  UpdateComplaintInput,
} from "./complaint.validation";

export interface UserContext {
  userId: string;
  role: Role;
}

const TRANSITION_MAP: Record<
  ComplaintStatus,
  Partial<Record<ComplaintStatus, Role[]>>
> = {
  [ComplaintStatus.PENDING]: {
    [ComplaintStatus.REJECTED]: [Role.MANAGER, Role.ADMIN],
  },
  [ComplaintStatus.ASSIGNED]: {
    [ComplaintStatus.IN_PROGRESS]: [Role.TECHNICIAN],
  },
  [ComplaintStatus.IN_PROGRESS]: {
    [ComplaintStatus.RESOLVED]: [Role.TECHNICIAN],
  },
  [ComplaintStatus.RESOLVED]: {
    [ComplaintStatus.CLOSED]: [Role.MANAGER, Role.ADMIN],
    [ComplaintStatus.IN_PROGRESS]: [Role.MANAGER, Role.ADMIN],
  },
  [ComplaintStatus.CLOSED]: {},
  [ComplaintStatus.REJECTED]: {},
  [ComplaintStatus.CANCELLED]: {},
};

const PRIORITY_ORDER: Record<Priority, number> = {
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1,
};

export const createComplaint = async (
  citizenId: string,
  data: CreateComplaintInput,
) => {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });

  if (!category || category.deletedAt) {
    throw new AppError("Category not found", 404);
  }

  const departmentId = category.departmentId;
  const slaDueAt = new Date(Date.now() + category.slaHours * 60 * 60 * 1000);
  const citizen = await prisma.user.findUnique({
    where: { id: citizenId },
    select: { isPremium: true },
  });

  const complaint = await prisma.complaint.create({
    data: {
      title: data.title,
      description: data.description,
      citizenId,
      categoryId: data.categoryId,
      departmentId,
      location: data.location,
      priority: citizen?.isPremium ? Priority.HIGH : data.priority,
      status: ComplaintStatus.PENDING,
      slaDueAt,
    },
    include: {
      category: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: citizenId,
      action: "COMPLAINT_CREATED",
      entityType: "Complaint",
      entityId: complaint.id,
    },
  });

  return complaint;
};

export const buildComplaintWhere = async (
  user: UserContext,
  query: ListQueryInput,
): Promise<Prisma.ComplaintWhereInput> => {
  const where: Prisma.ComplaintWhereInput = {
    deletedAt: null,
  };

  // Role-based visibility scoping
  if (user.role === Role.CITIZEN) {
    where.citizenId = user.userId;
  } else if (user.role === Role.TECHNICIAN) {
    where.assignedTechnicianId = user.userId;
  } else if (user.role === Role.MANAGER) {
    const departmentId = await getManagerDepartmentId(user.userId);
    where.departmentId = departmentId;
  }
  // ADMIN can see everything

  // Optional query filters
  if (query.status) {
    where.status = query.status;
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.overdue === true) {
    where.slaDueAt = { lt: new Date() };
    where.status = {
      notIn: [
        ComplaintStatus.RESOLVED,
        ComplaintStatus.CLOSED,
        ComplaintStatus.CANCELLED,
        ComplaintStatus.REJECTED,
      ],
    };
  }

  if (query.q) {
    const searchTerm = query.q.trim();
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
      ];
    }
  }

  return where;
};

export const listComplaints = async (
  user: UserContext,
  query: ListQueryInput,
) => {
  const where = await buildComplaintWhere(user, query);
  const total = await prisma.complaint.count({ where });

  // Priority sorting requires in-memory ordinal mapping since Prisma native enum sorting is alphabetical
  if (query.sortBy === "priority") {
    const allMatching = await prisma.complaint.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    allMatching.sort((a, b) => {
      const orderA = PRIORITY_ORDER[a.priority];
      const orderB = PRIORITY_ORDER[b.priority];
      return query.sortOrder === "asc" ? orderA - orderB : orderB - orderA;
    });

    const skip = (query.page - 1) * query.limit;
    const paginatedItems = allMatching.slice(skip, skip + query.limit);

    return {
      items: paginatedItems,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit) || 1,
    };
  }

  const skip = (query.page - 1) * query.limit;
  const items = await prisma.complaint.findMany({
    where,
    skip,
    take: query.limit,
    orderBy: { [query.sortBy]: query.sortOrder },
    include: {
      category: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.ceil(total / query.limit) || 1,
  };
};

export const searchComplaints = async (
  user: UserContext,
  query: ListQueryInput,
) => {
  if (!query.q || query.q.trim() === "") {
    throw new AppError("Search query string (q) is required", 400);
  }
  return listComplaints(user, query);
};

export const getComplaintById = async (user: UserContext, id: string) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  // Authorization check via shared helper (403 if found but not permitted)
  await verifyComplaintAccess(user, complaint);

  return complaint;
};

export const updateComplaint = async (
  user: UserContext,
  id: string,
  data: UpdateComplaintInput | ReTriageInput,
) => {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  const updatedFieldNames: string[] = [];
  let updatePayload: Prisma.ComplaintUncheckedUpdateInput = {};

  if (user.role === Role.CITIZEN) {
    if (complaint.citizenId !== user.userId) {
      throw new AppError(
        "Forbidden: You can only edit your own complaints",
        403,
      );
    }

    if (complaint.status !== ComplaintStatus.PENDING) {
      throw new AppError("Complaint can no longer be edited", 400);
    }

    const citizenInput = data as UpdateComplaintInput;

    if (citizenInput.title !== undefined) {
      updatePayload.title = citizenInput.title;
      updatedFieldNames.push("title");
    }
    if (citizenInput.description !== undefined) {
      updatePayload.description = citizenInput.description;
      updatedFieldNames.push("description");
    }
    if (citizenInput.location !== undefined) {
      updatePayload.location = citizenInput.location;
      updatedFieldNames.push("location");
    }
    if (citizenInput.priority !== undefined) {
      updatePayload.priority = citizenInput.priority;
      updatedFieldNames.push("priority");
    }

    if (
      citizenInput.categoryId !== undefined &&
      citizenInput.categoryId !== complaint.categoryId
    ) {
      const newCategory = await prisma.category.findUnique({
        where: { id: citizenInput.categoryId },
      });

      if (!newCategory || newCategory.deletedAt) {
        throw new AppError("Category not found", 404);
      }

      updatePayload.categoryId = citizenInput.categoryId;
      updatePayload.departmentId = newCategory.departmentId;
      updatePayload.slaDueAt = new Date(
        Date.now() + newCategory.slaHours * 60 * 60 * 1000,
      );
      updatedFieldNames.push("categoryId", "departmentId", "slaDueAt");
    }
  } else if (user.role === Role.MANAGER || user.role === Role.ADMIN) {
    if (user.role === Role.MANAGER) {
      const departmentId = await getManagerDepartmentId(user.userId);
      if (complaint.departmentId !== departmentId) {
        throw new AppError(
          "Forbidden: Complaint belongs to a different department",
          403,
        );
      }
    }

    const terminalStatuses: ComplaintStatus[] = [
      ComplaintStatus.CLOSED,
      ComplaintStatus.CANCELLED,
      ComplaintStatus.REJECTED,
    ];

    if (terminalStatuses.includes(complaint.status)) {
      throw new AppError(
        "Cannot update priority for closed, cancelled, or rejected complaints",
        400,
      );
    }

    const reTriageInput = data as ReTriageInput;
    updatePayload = { priority: reTriageInput.priority };
    updatedFieldNames.push("priority");
  } else {
    throw new AppError("Forbidden: Insufficient permissions", 403);
  }

  const updatedComplaint = await prisma.complaint.update({
    where: { id },
    data: updatePayload,
    include: {
      category: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.userId,
      action: "COMPLAINT_UPDATED",
      entityType: "Complaint",
      entityId: id,
      metadata: { updatedFields: updatedFieldNames },
    },
  });

  return updatedComplaint;
};

export const assignTechnician = async (
  user: UserContext,
  id: string,
  technicianId: string,
) => {
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    throw new AppError(
      "Forbidden: Only managers or admins can assign technicians",
      403,
    );
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  if (user.role === Role.MANAGER) {
    const departmentId = await getManagerDepartmentId(user.userId);
    if (complaint.departmentId !== departmentId) {
      throw new AppError(
        "Forbidden: Complaint belongs to a different department",
        403,
      );
    }
  }

  // Fetch technician user
  const technician = await prisma.user.findUnique({
    where: { id: technicianId },
  });

  if (
    !technician ||
    technician.deletedAt ||
    technician.role !== Role.TECHNICIAN ||
    technician.departmentId !== complaint.departmentId
  ) {
    throw new AppError(
      "Technician must be an active technician belonging to the same department as the complaint",
      400,
    );
  }

  // Atomic conditional update in transaction to avoid race conditions
  const assignedComplaint = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.updateMany({
      where: {
        id,
        status: ComplaintStatus.PENDING,
        deletedAt: null,
      },
      data: {
        status: ComplaintStatus.ASSIGNED,
        assignedTechnicianId: technicianId,
      },
    });

    if (result.count === 0) {
      throw new AppError(
        "This complaint was already assigned or updated by another request",
        409,
      );
    }

    await tx.auditLog.create({
      data: {
        actorId: user.userId,
        action: "COMPLAINT_ASSIGNED",
        entityType: "Complaint",
        entityId: id,
        metadata: { technicianId },
      },
    });

    return await tx.complaint.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        assignedTechnician: { select: { id: true, name: true, email: true } },
      },
    });
  });

  await Promise.all([
    createNotification({
      userId: complaint.citizenId,
      type: "COMPLAINT_ASSIGNED",
      message: `Your complaint "${complaint.title}" has been assigned to a technician`,
      relatedEntityType: "Complaint",
      relatedEntityId: id,
    }),
    createNotification({
      userId: technicianId,
      type: "NEW_ASSIGNMENT",
      message: `You have been assigned complaint "${complaint.title}"`,
      relatedEntityType: "Complaint",
      relatedEntityId: id,
    }),
  ]);

  return assignedComplaint;
};

export const updateStatus = async (
  user: UserContext,
  id: string,
  input: StatusUpdateInput,
) => {
  const { status: targetStatus, note } = input;

  const complaint = await prisma.complaint.findUnique({
    where: { id },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  const currentStatus = complaint.status;
  const allowedRolesForTransition =
    TRANSITION_MAP[currentStatus]?.[targetStatus];

  if (!allowedRolesForTransition) {
    throw new AppError(
      `Invalid status transition from ${currentStatus} to ${targetStatus}`,
      400,
    );
  }

  if (!allowedRolesForTransition.includes(user.role)) {
    throw new AppError(
      `Forbidden: Role ${user.role} is not permitted to perform transition from ${currentStatus} to ${targetStatus}`,
      403,
    );
  }

  // Ownership & scope verification
  if (user.role === Role.TECHNICIAN) {
    if (complaint.assignedTechnicianId !== user.userId) {
      throw new AppError(
        "Forbidden: You are not the assigned technician for this complaint",
        403,
      );
    }
  } else if (user.role === Role.MANAGER) {
    const departmentId = await getManagerDepartmentId(user.userId);
    if (complaint.departmentId !== departmentId) {
      throw new AppError(
        "Forbidden: Complaint belongs to a different department",
        403,
      );
    }
  }

  // Enforce required note for REJECTED, RESOLVED, and RESOLVED -> IN_PROGRESS reopen transition
  const isReopenTransition =
    currentStatus === ComplaintStatus.RESOLVED &&
    targetStatus === ComplaintStatus.IN_PROGRESS;

  const isNoteRequired =
    targetStatus === ComplaintStatus.REJECTED ||
    targetStatus === ComplaintStatus.RESOLVED ||
    isReopenTransition;

  if (isNoteRequired && (!note || note.trim() === "")) {
    throw new AppError(
      `A note is required when transitioning status to ${targetStatus}`,
      400,
    );
  }

  const updateData: Prisma.ComplaintUncheckedUpdateInput = {
    status: targetStatus,
  };

  if (targetStatus === ComplaintStatus.RESOLVED) {
    updateData.resolvedAt = new Date();
  }

  // Atomic conditional update in transaction to prevent race conditions
  const updatedComplaint = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.updateMany({
      where: {
        id,
        status: currentStatus,
        deletedAt: null,
      },
      data: updateData,
    });

    if (result.count === 0) {
      throw new AppError(
        "Complaint status was modified by another request",
        409,
      );
    }

    await tx.auditLog.create({
      data: {
        actorId: user.userId,
        action: "COMPLAINT_STATUS_CHANGED",
        entityType: "Complaint",
        entityId: id,
        metadata: {
          fromStatus: currentStatus,
          toStatus: targetStatus,
          note: note || null,
        },
      },
    });

    return await tx.complaint.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
  });

  if (targetStatus === ComplaintStatus.REJECTED) {
    await createNotification({
      userId: complaint.citizenId,
      type: "COMPLAINT_REJECTED",
      message: `Your complaint "${complaint.title}" was rejected: ${note}`,
      relatedEntityType: "Complaint",
      relatedEntityId: id,
    });
  } else if (targetStatus === ComplaintStatus.RESOLVED) {
    await createNotification({
      userId: complaint.citizenId,
      type: "COMPLAINT_RESOLVED",
      message: `Your complaint "${complaint.title}" has been resolved`,
      relatedEntityType: "Complaint",
      relatedEntityId: id,
    });
  } else if (targetStatus === ComplaintStatus.CLOSED) {
    await createNotification({
      userId: complaint.citizenId,
      type: "COMPLAINT_CLOSED",
      message: `Your complaint "${complaint.title}" has been closed`,
      relatedEntityType: "Complaint",
      relatedEntityId: id,
    });
  } else if (isReopenTransition && complaint.assignedTechnicianId) {
    await createNotification({
      userId: complaint.assignedTechnicianId,
      type: "COMPLAINT_REOPENED",
      message: `Complaint "${complaint.title}" was reopened: ${note}`,
      relatedEntityType: "Complaint",
      relatedEntityId: id,
    });
  }

  return updatedComplaint;
};

export const cancelComplaint = async (user: UserContext, id: string) => {
  if (user.role !== Role.CITIZEN) {
    throw new AppError(
      "Forbidden: Only citizens can cancel their complaints",
      403,
    );
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  if (complaint.citizenId !== user.userId) {
    throw new AppError(
      "Forbidden: You can only cancel your own complaints",
      403,
    );
  }

  // Atomic update: only cancel if status is still PENDING
  const result = await prisma.complaint.updateMany({
    where: {
      id,
      citizenId: user.userId,
      status: ComplaintStatus.PENDING,
      deletedAt: null,
    },
    data: {
      status: ComplaintStatus.CANCELLED,
    },
  });

  if (result.count === 0) {
    throw new AppError("Complaint can no longer be cancelled", 400);
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.userId,
      action: "COMPLAINT_CANCELLED",
      entityType: "Complaint",
      entityId: id,
    },
  });

  return await prisma.complaint.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });
};

export const softDeleteComplaint = async (user: UserContext, id: string) => {
  if (user.role !== Role.ADMIN) {
    throw new AppError("Forbidden: Only admins can delete complaints", 403);
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  await prisma.complaint.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.userId,
      action: "COMPLAINT_DELETED",
      entityType: "Complaint",
      entityId: id,
    },
  });

  return { message: "Complaint soft-deleted successfully" };
};

export const reopenComplaint = async (
  user: UserContext,
  id: string,
  input: ReopenComplaintInput,
) => {
  if (user.role !== Role.CITIZEN) {
    throw new AppError(
      "Forbidden: Only citizens can reopen their complaints",
      403,
    );
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, slaHours: true } },
      assignedTechnician: {
        select: { id: true, role: true, isAvailable: true, deletedAt: true },
      },
    },
  });

  if (!complaint || complaint.deletedAt) {
    throw new AppError("Complaint not found", 404);
  }

  if (complaint.citizenId !== user.userId) {
    throw new AppError(
      "Forbidden: You can only reopen your own complaints",
      403,
    );
  }

  if (complaint.status !== ComplaintStatus.RESOLVED) {
    throw new AppError("Only resolved complaints can be reopened", 400);
  }

  if (!complaint.resolvedAt) {
    throw new AppError("Complaint has no recorded resolution date", 400);
  }

  const windowMs = config.REOPEN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const elapsedMs = Date.now() - complaint.resolvedAt.getTime();
  if (elapsedMs > windowMs) {
    throw new AppError(
      `Reopen window expired. Complaints can only be reopened within ${config.REOPEN_WINDOW_DAYS} days of resolution.`,
      400,
    );
  }

  const tech = complaint.assignedTechnician;
  const isTechActiveAndAvailable = Boolean(
    tech &&
      !tech.deletedAt &&
      tech.role === Role.TECHNICIAN &&
      tech.isAvailable,
  );

  const newStatus = isTechActiveAndAvailable
    ? ComplaintStatus.ASSIGNED
    : ComplaintStatus.PENDING;
  const newAssignedTechnicianId = isTechActiveAndAvailable
    ? complaint.assignedTechnicianId
    : null;
  const newSlaDueAt = new Date(
    Date.now() + complaint.category.slaHours * 60 * 60 * 1000,
  );
  const now = new Date();

  const updatedComplaint = await prisma.$transaction(async (tx) => {
    const result = await tx.complaint.updateMany({
      where: {
        id,
        citizenId: user.userId,
        status: ComplaintStatus.RESOLVED,
        deletedAt: null,
      },
      data: {
        status: newStatus,
        assignedTechnicianId: newAssignedTechnicianId,
        resolvedAt: null,
        reopenedAt: now,
        reopenCount: { increment: 1 },
        slaDueAt: newSlaDueAt,
        overdueNotifiedAt: null,
      },
    });

    if (result.count === 0) {
      throw new AppError(
        "Complaint status was modified by another request",
        409,
      );
    }

    await tx.auditLog.create({
      data: {
        actorId: user.userId,
        action: "COMPLAINT_REOPENED",
        entityType: "Complaint",
        entityId: id,
        metadata: {
          fromStatus: ComplaintStatus.RESOLVED,
          toStatus: newStatus,
          reason: input.reason,
          assignedTechnicianId: newAssignedTechnicianId,
        },
      },
    });

    return await tx.complaint.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        assignedTechnician: { select: { id: true, name: true, email: true } },
      },
    });
  });

  if (newAssignedTechnicianId) {
    await createNotification({
      userId: newAssignedTechnicianId,
      type: "COMPLAINT_REOPENED",
      message: `Complaint "${complaint.title}" was reopened by citizen: ${input.reason}`,
      relatedEntityType: "Complaint",
      relatedEntityId: id,
    });
  } else {
    const managers = await prisma.user.findMany({
      where: {
        role: Role.MANAGER,
        departmentId: complaint.departmentId,
        deletedAt: null,
      },
      select: { id: true },
    });
    await Promise.all(
      managers.map((mgr) =>
        createNotification({
          userId: mgr.id,
          type: "COMPLAINT_REOPENED",
          message: `Complaint "${complaint.title}" was reopened and needs technician assignment: ${input.reason}`,
          relatedEntityType: "Complaint",
          relatedEntityId: id,
        }),
      ),
    );
  }

  return updatedComplaint;
};
