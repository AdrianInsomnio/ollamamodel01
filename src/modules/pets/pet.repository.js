'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PetRepository {
  async create(data) {
    let createData = { ...data };
    if (createData.clientId !== undefined) {
      createData.client = { connect: { id: createData.clientId } };
      delete createData.clientId;
    }
    if (createData.organizationId !== undefined) {
      createData.organization = { connect: { id: createData.organizationId } };
      delete createData.organizationId;
    }
    return await prisma.pet.create({ data: createData });
  }

  async findById(id) {
    return await prisma.pet.findUnique({ where: { id: Number(id) } });
  }

  async findMany(params = {}) {
    const { skip, take, where, orderBy } = params;
    return await prisma.pet.findMany({ skip, take, where, orderBy });
  }

  async update(id, data) {
    let updateData = { ...data };
    if (updateData.clientId !== undefined) {
      updateData.client = { connect: { id: updateData.clientId } };
      delete updateData.clientId;
    }
    if (updateData.organizationId !== undefined) {
      updateData.organization = { connect: { id: updateData.organizationId } };
      delete updateData.organizationId;
    }
    return await prisma.pet.update({ where: { id: Number(id) }, data: updateData });
  }

  async delete(id) {
    return await prisma.pet.delete({ where: { id: Number(id) } });
  }
}

module.exports = new PetRepository();
