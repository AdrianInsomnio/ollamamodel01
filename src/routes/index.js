const authRoutes = require('../modules/auth/auth.routes');
const userRoutes = require('../modules/users/user.routes');
const clientRoutes = require('../modules/clients/client.routes');
const petRoutes = require('../modules/pets/pet.routes');
const appointmentRoutes = require('../modules/appointments/appointment.routes');
const consultationRoutes = require('../modules/consultations/consultation.routes');
const productRoutes = require('../modules/products/product.routes');
const serviceRoutes = require('../modules/services/service.routes');
const saleRoutes = require('../modules/sales/sale.routes');
const diagnosisRoutes = require('../modules/diagnoses/diagnosis.routes');
const treatmentRoutes = require('../modules/treatments/treatment.routes');
const prescriptionRoutes = require('../modules/prescriptions/prescription.routes');

module.exports = (app) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/clients', clientRoutes);
  app.use('/api/pets', petRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/consultations', consultationRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/sales', saleRoutes);
  app.use('/api/diagnoses', diagnosisRoutes);
  app.use('/api/treatments', treatmentRoutes);
  app.use('/api/prescriptions', prescriptionRoutes);
};
