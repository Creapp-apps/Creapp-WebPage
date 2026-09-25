-- Permitir que los clientes públicos (anónimos) puedan firmar propuestas publicadas
-- Esta política permite la actualización de una propuesta únicamente si su estado actual es 'published'
-- y la transición se realiza hacia el estado 'signed'.

CREATE POLICY "Public can sign published proposals"
ON public.proposals
FOR UPDATE
TO public
USING (status = 'published')
WITH CHECK (status = 'signed');
