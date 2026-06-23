-- Add contract_description column to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contract_description TEXT DEFAULT 'Acuerdo formal que establece las bases y condiciones legales para la ejecución del proyecto de desarrollo de software detallado en esta propuesta.';
