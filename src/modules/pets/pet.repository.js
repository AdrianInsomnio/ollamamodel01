"use strict";
const { prisma } = require("../../lib/prisma");

class PetRepository {
  /**
   * Crea una mascota asociada a un cliente (de la misma clinica).
   * Se asume que el `service` ya valido que el cliente pertenece a `clinicId`.
   * @param {Object} data - payload saneado por Joi (sin clientId ya expandido)
   * @param {number} clinicId
   */
  async create(data, clinicId) {
    const { clientId, clinicId: _clinicId, ...rest } = data;
    return await prisma.pet.create({
      data: {
        ...rest,
        client: { connect: { id: Number(clientId) } },
        // pet no tiene clinicId propio; el tenant se deriva via client.clinicId.
        // clinicId se acepta por consistencia de API.
      },
    });
  }

  async findById(id) {
    return await prisma.pet.findUnique({ where: { id: Number(id) } });
  }

  /**
   * Lista mascotas filtrando por la clinica del cliente.
   * `where` puede traer { clientId, client: { organizationId } } legado; lo
   * normalizamos a `client: { clinicId }`.
   */
  async findMany(params = {}) {
    const { skip, take, where = {}, orderBy } = params;
    const normalized = { ...where };
    if (normalized.clinicId !== undefined) {
      normalized.client = { ...(normalized.client || {}), clinicId: normalized.clinicId };
      delete normalized.clinicId;
    }
    if (normalized.client && normalized.client.organizationId !== undefined) {
      normalized.client = {
        ...normalized.client,
        clinicId: normalized.client.organizationId,
      };
      delete normalized.client.organizationId;
    }
    return await prisma.pet.findMany({ skip, take, where: normalized, orderBy });
  }

  async update(id, data) {
    const updateData = { ...data };
    if (updateData.clientId !== undefined) {
      updateData.client = { connect: { id: Number(updateData.clientId) } };
      delete updateData.clientId;
    }
    return await prisma.pet.update({ where: { id: Number(id) }, data: updateData });
  }

  async delete(id) {
    return await prisma.pet.delete({ where: { id: Number(id) } });
  }
}

module.exports = new PetRepository();
