'use strict';
const petService = require('./pet.service');
const { catchAsync } = require('../../utils/catchAsync');
const { AppError } = require('../../core/errors/AppError');

const requireClinicId = (user) => {
  if (user == null || user.clinicId == null) {
    throw new AppError('User has no clinic assigned', 403, 'NO_CLINIC_ASSIGNED');
  }
  return Number(user.clinicId);
};

exports.createPet = catchAsync(async (req, res) => {
  const clinicId = requireClinicId(req.user);
  const petData = { ...req.body, clinicId };
  const pet = await petService.createPet(petData);
  res.status(201).json({ pet });
});

exports.getPet = catchAsync(async (req, res) => {
  const clinicId = requireClinicId(req.user);
  const pet = await petService.getPetById(req.params.id, clinicId);
  res.status(200).json({ pet });
});

exports.getPets = catchAsync(async (req, res) => {
  const clinicId = requireClinicId(req.user);
  const pets = await petService.getPets(req.query, clinicId);
  res.status(200).json({ pets });
});

exports.updatePet = catchAsync(async (req, res) => {
  const clinicId = requireClinicId(req.user);
  // Refuse tenant overrides via body
  const { clinicId: _ignored, organizationId: _ignored2, ...petData } = req.body;
  const pet = await petService.updatePet(req.params.id, petData, clinicId);
  res.status(200).json({ pet });
});

exports.deletePet = catchAsync(async (req, res) => {
  const clinicId = requireClinicId(req.user);
  await petService.deletePet(req.params.id, clinicId);
  res.status(204).json();
});
