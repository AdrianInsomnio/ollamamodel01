const { prisma } = require('../../lib/prisma');

const create = async (data, organizationId) => {
  return await prisma.appointment.create({
    data: {
      ...data,
      organizationId
    },
    include: {
      client: true,
      pet: true
    }
  });
};

const findAll = async (organizationId) => {
  return await prisma.appointment.findMany({
    where: { organizationId },
    include: {
      client: true,
      pet: true,
      consultation: true
    },
    orderBy: { date: 'desc' }
  });
};

const findById = async (id, organizationId) => {
  return await prisma.appointment.findFirst({
    where: { id, organizationId },
    include: {
      client: true,
      pet: true,
      consultation: true
    }
  });
};

const findByPetAndDateRange = async (petId, startDate, endDate, organizationId) => {
  return await prisma.appointment.findMany({
    where: {
      petId,
      organizationId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      client: true,
      pet: true
    }
  });
};

const findByDateRange = async (startDate, endDate, organizationId) => {
  return await prisma.appointment.findMany({
    where: {
      organizationId,
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      client: true,
      pet: true
    },
    orderBy: { date: 'asc' }
  });
};

const checkAvailability = async (date, duration, organizationId) => {
  const endTime = new Date(date.getTime() + duration * 60000);

  const conflicts = await prisma.appointment.findMany({
    where: {
      organizationId,
      status: { not: 'cancelled' },
      date: {
        lt: endTime
      }
    }
  });

  return !conflicts.some(appointment => {
    const appointmentEnd = new Date(appointment.date.getTime() + appointment.duration * 60000);
    return date < appointmentEnd;
  });
};

const update = async (id, organizationId, data) => {
  return await prisma.appointment.update({
    where: { id, organizationId },
    data,
    include: {
      client: true,
      pet: true,
      consultation: true
    }
  });
};

const remove = async (id, organizationId) => {
  return await prisma.appointment.delete({
    where: { id, organizationId }
  });
};

module.exports = {
  create,
  findAll,
  findById,
  findByPetAndDateRange,
  findByDateRange,
  checkAvailability,
  update,
  remove
};


