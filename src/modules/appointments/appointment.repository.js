const { prisma } = require('../../lib/prisma');

const create = async (data, clinicId) => {
  return await prisma.appointment.create({
    data: {
      ...data,
      clinicId
    },
    include: {
      client: true,
      pet: true
    }
  });
};

const findAll = async (clinicId) => {
  return await prisma.appointment.findMany({
    where: { clinicId },
    include: {
      client: true,
      pet: true,
      consultation: true
    },
    orderBy: { date: 'desc' }
  });
};

const findById = async (id, clinicId) => {
  return await prisma.appointment.findFirst({
    where: { id, clinicId },
    include: {
      client: true,
      pet: true,
      consultation: true
    }
  });
};

const findByPetAndDateRange = async (petId, startDate, endDate, clinicId) => {
  return await prisma.appointment.findMany({
    where: {
      petId,
      clinicId,
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

const findByDateRange = async (startDate, endDate, clinicId) => {
  return await prisma.appointment.findMany({
    where: {
      clinicId,
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

const checkAvailability = async (date, duration, clinicId) => {
  const endTime = new Date(date.getTime() + duration * 60000);

  const conflicts = await prisma.appointment.findMany({
    where: {
      clinicId,
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

const update = async (id, clinicId, data) => {
  return await prisma.appointment.update({
    where: { id, clinicId },
    data,
    include: {
      client: true,
      pet: true,
      consultation: true
    }
  });
};

const remove = async (id, clinicId) => {
  return await prisma.appointment.delete({
    where: { id, clinicId }
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


