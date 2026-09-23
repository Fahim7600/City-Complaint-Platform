import { ComplaintStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { createNotification } from "../modules/notifications/notification.service";

export const checkOverdueSlas = async () => {
  const now = new Date();
  const complaints = await prisma.complaint.findMany({
    where: {
      deletedAt: null,
      slaDueAt: { lt: now },
      status: {
        in: [
          ComplaintStatus.PENDING,
          ComplaintStatus.ASSIGNED,
          ComplaintStatus.IN_PROGRESS,
        ],
      },
      overdueNotifiedAt: null,
    },
    select: { id: true, title: true, departmentId: true },
  });

  let complaintsProcessed = 0;
  let notificationsSent = 0;

  for (const complaint of complaints) {
    try {
      const managers = await prisma.user.findMany({
        where: {
          role: Role.MANAGER,
          departmentId: complaint.departmentId,
          deletedAt: null,
        },
        select: { id: true },
      });
      const results = await Promise.all(
        managers.map((manager) =>
          createNotification({
            userId: manager.id,
            type: "SLA_OVERDUE",
            message: `Complaint "${complaint.title}" is overdue`,
            relatedEntityType: "Complaint",
            relatedEntityId: complaint.id,
          }),
        ),
      );
      notificationsSent += results.filter(Boolean).length;
      if (results.every(Boolean)) {
        await prisma.complaint.update({
          where: { id: complaint.id },
          data: { overdueNotifiedAt: now },
        });
        complaintsProcessed += 1;
      }
    } catch (error) {
      console.error(
        `[SLA] Failed to process overdue complaint ${complaint.id}`,
        error,
      );
    }
  }

  return { complaintsProcessed, notificationsSent };
};
