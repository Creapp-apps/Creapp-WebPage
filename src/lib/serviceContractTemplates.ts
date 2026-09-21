import type { ServiceDetails } from './proposalTypes';

export type CreappProductId = 'stacked' | 'trazapp' | 'dental-ia';

export interface CreappProductPreset {
  id: CreappProductId;
  name: string;
  category: string;
  tagline: string;
  hero_badge: string;
  hero_title: string;
  brand_color_primary: string;
  brand_color_secondary: string;
  logo_url: string;
  default_service_details: ServiceDetails;
  contract_description: string;
  contract_template: string;
}

export const STACKED_PRESET: CreappProductPreset = {
  id: 'stacked',
  name: 'Stacked',
  category: 'Foodtech & Gastronomía',
  tagline: 'Tu hamburguesería 100% digital: KDS, comanderas, menú QR, pedidos online y delivery centralizado.',
  hero_badge: 'STACKED // CREAPP FOODTECH LAB',
  hero_title: 'STACKED SAAS',
  brand_color_primary: '#FF6B2C',
  brand_color_secondary: '#FFB800',
  logo_url: '/products/stacked-logo.png',
  default_service_details: {
    plan_name: 'Stacked Business Cloud',
    billing_frequency: 'monthly',
    setup_fee: 'Bonificado',
    recurring_fee: '$350 USD / mes',
    sla_uptime: '99.5%',
    support_channels: 'WhatsApp Prioritario + Soporte vía Tickets/Email',
    response_time_critical: '< 2 horas (Incidentes Críticos P1)',
    response_time_normal: '< 12 horas hábiles (Consultas y P2)',
    min_term_months: '6 meses',
    auto_renew: true,
    limits: {
      users: 'Ilimitados',
      branches: 'Hasta 3 sucursales / salones',
      storage: '50 GB Cloud Storage',
      custom_notes: 'Backups automáticos diarios, sincronización en tiempo real y parches de seguridad continuos.'
    }
  },
  contract_description:
    'Contrato marco de prestación de servicios tecnológicos, soporte continuo y licenciamiento de software en la nube (SaaS) para la plataforma Stacked, desarrollado y operado exclusivamente por CreAPP Software Lab.',
  contract_template: `CONTRATO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS Y LICENCIA DE USO (SaaS) — PLATAFORMA STACKED

En la localidad de {location}, al día {date}, se celebra el presente Contrato de Servicios Tecnológicos entre:

1. Por una parte, CreAPP Software Lab, representada en este acto por Sebastián Maza (CTO), en adelante denominada "EL PROVEEDOR"; y
2. Por la otra parte, {client_name}, representada legalmente en este acto por [input:Representante Legal], con DNI/CUIT N° [input:DNI/CUIT] en su carácter de [input:Cargo del Firmante], en adelante denominada "EL CLIENTE".

Ambas partes convienen celebrar el presente acuerdo bajo las siguientes cláusulas y condiciones:

PRIMERA: OBJETO Y LICENCIA DE USO DE LA PLATAFORMA
EL PROVEEDOR otorga a EL CLIENTE una licencia de uso de software bajo modalidad SaaS (Software as a Service) no exclusiva, intransferible y revocable sobre la plataforma tecnológica "Stacked", para su uso operativo y comercial en locales gastronómicos según el plan contratado. 
Queda expresamente establecido que CreAPP Software Lab es el único y exclusivo titular y propietario de la propiedad intelectual, el código fuente, la arquitectura, los diseños, marcas y derechos de autor de la plataforma Stacked. El presente contrato en ningún caso constituye cesión, transferencia ni venta de código fuente o propiedad intelectual alguna.

SEGUNDA: CONDICIONES ECONÓMICAS Y FORMA DE PAGO
EL CLIENTE abonará a EL PROVEEDOR la tarifa convenida de {total_value}, pagadera de forma mensual por período adelantado del 1 al 10 de cada mes calendario.
La falta de pago en término devengará un interés moratorio equivalente a la tasa activa bancaria y facultará a EL PROVEEDOR, previa notificación fehaciente con 5 (cinco) días hábiles de antelación, a suspender temporalmente el acceso a la plataforma hasta la regularización de las obligaciones adeudadas, sin que ello genere derecho a reclamo o indemnización para EL CLIENTE.

TERCERA: NIVEL DE SERVICIO (SLA) Y DISPONIBILIDAD
EL PROVEEDOR garantiza una disponibilidad mensual mínima del servicio del 99.5% (noventa y nueve coma cinco por ciento) del tiempo, excluyendo aquellas ventanas de mantenimiento preventivo o actualizaciones críticas de infraestructura, las cuales serán notificadas a EL CLIENTE con una antelación mínima de 24 horas.

CUARTA: SOPORTE TÉCNICO Y MATRIZ DE INCIDENCIAS
EL PROVEEDOR brindará asistencia técnica y mesa de ayuda a través de WhatsApp Prioritario y correo oficial bajo la siguiente matriz:
a) Incidentes Críticos (P1 - Caída total de comandera o KDS en salón): Tiempo de primera respuesta menor a 2 horas.
b) Incidentes Medios o Consultas Operativas (P2): Tiempo de primera respuesta menor a 12 horas hábiles.
c) Mantenimiento y Backups: Copias de seguridad automáticas de comandas, menú y ventas con replicación periódica.

QUINTA: CONFIDENCIALIDAD Y PROPIEDAD DE LOS DATOS
Toda la información operativa, cartas digitales, ventas y datos de comensales que EL CLIENTE procese en Stacked es y continuará siendo de su exclusiva propiedad. CreAPP Software Lab actúa como encargado del tratamiento tecnológico y custodia, comprometiéndose a preservar secreto profesional absoluto.

SEXTA: VIGENCIA, RENOVACIÓN Y RESCISIÓN
El presente contrato tendrá una vigencia mínima inicial de 6 (seis) meses. Cumplido dicho plazo, se renovará automáticamente por períodos iguales sucesivos, salvo que cualquiera de las partes comunique su voluntad en contrario con un preaviso mínimo de 30 días de anticipación. En caso de rescisión, EL PROVEEDOR pondrá a disposición la exportación de sus datos en formato estándar durante 30 días corridos previo a la baja definitiva.

SÉPTIMA: LIMITACIÓN DE RESPONSABILIDAD Y JURISDICCIÓN
La responsabilidad indemnizatoria total de EL PROVEEDOR queda limitada al monto equivalente a 1 (una) mensualidad abonada por EL CLIENTE. Para todos los efectos legales, las partes se someten a los Tribunales Ordinarios competentes, renunciando a cualquier otro fuero.

En prueba de conformidad, se suscribe digitalmente el presente documento el día {date}.`
};

export const TRAZAPP_PRESET: CreappProductPreset = {
  id: 'trazapp',
  name: 'Trazapp',
  category: 'Agrotech & Trazabilidad Cannabis',
  tagline: 'Gestión agronómica integral, trazabilidad Reprocann, dispensario club y telemetría IoT de salas en tiempo real.',
  hero_badge: 'TRAZAPP // CREAPP AGROTECH & BIOTECH',
  hero_title: 'TRAZAPP PLATFORM',
  brand_color_primary: '#10B981',
  brand_color_secondary: '#03FC41',
  logo_url: '/products/trazapp-logo.png',
  default_service_details: {
    plan_name: 'Trazapp Club Pro & Telemetría',
    billing_frequency: 'monthly',
    setup_fee: 'Bonificado',
    recurring_fee: '$450 USD / mes',
    sla_uptime: '99.5%',
    support_channels: 'WhatsApp Guardias Técnicas + Mesa de Ayuda Agrotech',
    response_time_critical: '< 2 horas (Fallas de Telemetría o Dispensario P1)',
    response_time_normal: '< 12 horas hábiles (Consultas y Carga Genética P2)',
    min_term_months: '6 meses',
    auto_renew: true,
    limits: {
      users: 'Ilimitados',
      branches: 'Hasta 1.000 plantas activas / 10 Salas IoT',
      storage: '100 GB Cloud Storage',
      custom_notes: 'Trazabilidad por QR, registro genealógico completo, auditoría de dispensario y sincronización IoT.'
    }
  },
  contract_description:
    'Contrato marco de prestación de servicios de software en la nube (SaaS), telemetría IoT y trazabilidad agronómica para la plataforma Trazapp, desarrollada y operada exclusivamente por CreAPP Software Lab.',
  contract_template: `CONTRATO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS Y LICENCIA DE USO (SaaS) — PLATAFORMA TRAZAPP

En la localidad de {location}, al día {date}, se celebra el presente Contrato de Servicios Tecnológicos entre:

1. Por una parte, CreAPP Software Lab, representada en este acto por Sebastián Maza (CTO), en adelante denominada "EL PROVEEDOR"; y
2. Por la otra parte, {client_name}, representada legalmente en este acto por [input:Representante Legal], con DNI/CUIT N° [input:DNI/CUIT] en su carácter de [input:Cargo del Firmante], en adelante denominada "EL CLIENTE".

Ambas partes convienen celebrar el presente acuerdo bajo las siguientes cláusulas y condiciones:

PRIMERA: OBJETO Y LICENCIA DE USO DE LA PLATAFORMA TRAZAPP
EL PROVEEDOR otorga a EL CLIENTE una licencia de uso de software bajo modalidad SaaS (Software as a Service) no exclusiva, intransferible y revocable sobre la plataforma tecnológica "Trazapp", orientada a la gestión agronómica, trazabilidad de plantas y lotes por código QR, control de genéticas, salas de cultivo, telemetría de sensores IoT y dispensario según el plan contratado.
Queda expresamente pactado que CreAPP Software Lab es la titular y propietaria absoluta de los derechos de autor, código fuente, algoritmos, firmware de interconexión IoT y diseños de Trazapp. El presente acuerdo no otorga derecho alguno sobre el código o propiedad intelectual del software.

SEGUNDA: RESPONSABILIDAD REGULATORIA Y LEGAL
EL CLIENTE declara bajo juramento que su operatoria de cultivo, dispensario e investigación se encuentra debidamente habilitada y ajustada a las normativas vigentes aplicables en su jurisdicción (ej. normativas REPROCANN / INASE / Ministerio de Salud). EL PROVEEDOR provee exclusivamente las herramientas tecnológicas y digitales para el registro y trazabilidad, quedando expresamente eximido de cualquier responsabilidad derivada de la actividad agronómica o legal que EL CLIENTE desarrolle fuera de la plataforma.

TERCERA: CONDICIONES ECONÓMICAS Y PAGO
EL CLIENTE abonará a EL PROVEEDOR la tarifa convenida de {total_value}, pagadera de forma mensual por período adelantado del 1 al 10 de cada mes calendario. La mora habilitará la suspensión del servicio tras 5 (cinco) días hábiles de notificación fehaciente.

CUARTA: SLA DE TELEMETRÍA Y DISPONIBILIDAD DE PLATAFORMA
EL PROVEEDOR garantiza un Uptime de disponibilidad del 99.5% mensual en los servidores cloud y colectores de datos de telemetría IoT. 
El soporte para incidentes críticos (P1 - Caída total de dispensario o fallas de alertas ambientales) tendrá un tiempo de primera respuesta menor a 2 horas. Para consultas generales de uso o configuración de salas (P2), la respuesta será menor a 12 horas hábiles.

QUINTA: CUSTODIA Y CIFRADO DE DATOS AGRONÓMICOS
Todos los registros genealógicos, fenotipos, pesajes y movimientos de socios ingresados por EL CLIENTE son de su exclusiva propiedad. EL PROVEEDOR implementará cifrado en reposo y en tránsito para proteger la confidencialidad de la información agronómica y médica almacenada.

SEXTA: VIGENCIA Y RESCISIÓN
El contrato rige por un plazo inicial de 6 (seis) meses renovable automáticamente por períodos iguales, con un preaviso de rescisión de 30 días. En caso de baja, EL CLIENTE tendrá 30 días para exportar sus libros de trazabilidad y datos históricos en formato estructurado (CSV/PDF).

En prueba de conformidad, se suscribe digitalmente el presente documento el día {date}.`
};

export const DENTALIA_PRESET: CreappProductPreset = {
  id: 'dental-ia',
  name: 'Dental-IA',
  category: 'Healthtech & Odontología con IA',
  tagline: 'Sistema Operativo Clínico: Odontograma FDI interactivo, IA en WhatsApp 24/7 oficial y turnero con señas automáticas.',
  hero_badge: 'DENTAL-IA // CREAPP HEALTHTECH LAB',
  hero_title: 'DENTAL-IA OS',
  brand_color_primary: '#2563EB',
  brand_color_secondary: '#06B6D4',
  logo_url: '/products/dentalia-logo.png',
  default_service_details: {
    plan_name: 'Dental-IA Clínica Integral',
    billing_frequency: 'monthly',
    setup_fee: 'Bonificado',
    recurring_fee: '$380 USD / mes',
    sla_uptime: '99.7%',
    support_channels: 'WhatsApp Directo + Soporte Clínico Especializado',
    response_time_critical: '< 2 horas (Caída de IA en WhatsApp o Turnero P1)',
    response_time_normal: '< 12 horas hábiles (Ajustes de Odontograma y Fichas P2)',
    min_term_months: '6 meses',
    auto_renew: true,
    limits: {
      users: 'Hasta 5 Odontólogos / Secretarías ilimitadas',
      branches: '1 Consultorio / Centro Odontológico',
      storage: '100 GB para Radiografías y Tomografías',
      custom_notes: 'Incluye agente IA 24/7 en WhatsApp (Meta Cloud API), odontograma FDI 32 piezas y sala de espera digital.'
    }
  },
  contract_description:
    'Contrato marco de prestación de software en la nube (SaaS), agentes de inteligencia artificial y soporte técnico para la plataforma odontológica Dental-IA, desarrollada y operada exclusivamente por CreAPP Software Lab.',
  contract_template: `CONTRATO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS Y LICENCIA DE USO (SaaS) — PLATAFORMA DENTAL-IA

En la localidad de {location}, al día {date}, se celebra el presente Contrato de Servicios Tecnológicos entre:

1. Por una parte, CreAPP Software Lab, representada en este acto por Sebastián Maza (CTO), en adelante denominada "EL PROVEEDOR"; y
2. Por la otra parte, {client_name}, representada legalmente en este acto por [input:Representante Legal], con DNI/CUIT N° [input:DNI/CUIT] en su carácter de [input:Cargo del Firmante], en adelante denominada "EL CLIENTE".

Ambas partes convienen celebrar el presente acuerdo bajo las siguientes cláusulas y condiciones:

PRIMERA: OBJETO Y LICENCIA DE USO DE LA PLATAFORMA DENTAL-IA
EL PROVEEDOR concede a EL CLIENTE una licencia de uso de software bajo modalidad SaaS (Software as a Service) no exclusiva, intransferible y revocable sobre la plataforma tecnológica "Dental-IA", la cual comprende: el sistema de agendamiento y atención automatizada mediante agentes con Inteligencia Artificial integrados a la API oficial de WhatsApp (Meta Cloud), el odontograma interactivo multicapa bajo sistema FDI (32 piezas dentales), historia clínica digital con almacenamiento de estudios radiológicos, sala de espera digital en tiempo real y turnero online con cobro de señas automatizado vía Mercado Pago.
CreAPP Software Lab es el único y exclusivo titular y propietario de todos los derechos de propiedad intelectual, código fuente, flujos y arquitecturas de Inteligencia Artificial de la plataforma Dental-IA. El presente acuerdo no transmite derechos de propiedad intelectual sobre el software ni sus modelos.

SEGUNDA: PROTECCIÓN DE DATOS DE SALUD Y CONFIDENCIALIDAD
Las partes reconocen que las historias clínicas odontológicas, odontogramas y datos filiatorios de los pacientes constituyen información sensible protegida por las normativas de Protección de Datos Personales y Derechos del Paciente. EL CLIENTE es el único titular y responsable civil y profesional de los datos médicos cargados. EL PROVEEDOR actúa en calidad de encargado de custodia tecnológica, garantizando cifrado de extremo a extremo, copias de seguridad automáticas y secreto profesional indelegable.

TERCERA: INTEGRACIONES CON TERCEROS (META CLOUD & MERCADO PAGO)
EL PROVEEDOR garantiza la estabilidad y correcto funcionamiento de los conectores tecnológicos hacia la API oficial de WhatsApp (Meta Cloud) y la pasarela de pagos de Mercado Pago. Los costos que Meta Cloud pudiera requerir por consumo de conversaciones oficiales y las comisiones directas de cobro de Mercado Pago son liquidadas directamente por dichos proveedores a EL CLIENTE, sin sobrecargos ni intermediación financiera por parte de Dental-IA.

CUARTA: CONDICIONES ECONÓMICAS
EL CLIENTE abonará a EL PROVEEDOR la suma convenida de {total_value}, pagadera mensualmente por período adelantado del 1 al 10 de cada mes. 

QUINTA: DISPONIBILIDAD (SLA) Y SOPORTE
EL PROVEEDOR compromete una disponibilidad de plataforma del 99.7% mensual. 
La atención técnica de incidentes críticos (P1 - Desconexión del agente de WhatsApp o caída del turnero web) tendrá una respuesta máxima menor a 2 horas. Las consultas de configuración médica o liquidación de profesionales (P2) se atenderán en un plazo menor a 12 horas hábiles.

SEXTA: VIGENCIA Y RESCISIÓN
El presente contrato se celebra por un período inicial de 6 (seis) meses, con renovación automática. Cualquiera de las partes podrá rescindir el servicio notificando con 30 días corridos de anticipación. Finalizado el vínculo, EL PROVEEDOR mantendrá habilitada la exportación de fichas clínicas y radiografías durante 30 días corridos para su debida preservación odontolegal.

En prueba de conformidad, se suscribe digitalmente el presente documento el día {date}.`
};

export const CREAPP_PRODUCTS: CreappProductPreset[] = [
  STACKED_PRESET,
  TRAZAPP_PRESET,
  DENTALIA_PRESET
];

export function getCreappProductPreset(productId?: string): CreappProductPreset {
  if (!productId) return STACKED_PRESET;
  const match = CREAPP_PRODUCTS.find(p => p.id === productId || p.id === productId.toLowerCase());
  return match || STACKED_PRESET;
}

// Re-exports for backwards compatibility
export const DEFAULT_SERVICE_DETAILS: ServiceDetails = STACKED_PRESET.default_service_details;
export const STACKED_CONTRACT_DESCRIPTION = STACKED_PRESET.contract_description;
export const STACKED_SERVICE_CONTRACT_TEMPLATE = STACKED_PRESET.contract_template;

export const DEVELOPMENT_CONTRACT_DESCRIPTION = 
  'Acuerdo formal que establece las bases y condiciones legales para la ejecución del proyecto de desarrollo de software detallado en esta propuesta comercial.';

export const DEVELOPMENT_CONTRACT_TEMPLATE = `CONTRATO DE SERVICIOS TECNOLÓGICOS Y DESARROLLO DE SOFTWARE

Entre CreAPP Software Lab, representada por Sebastián Maza, en adelante "EL DESARROLLADOR"; y por la otra parte {client_name}, representada por [input:Representante Legal], con DNI/CUIT N° [input:DNI/CUIT] en su carácter de [input:Cargo del Firmante], en adelante "EL CLIENTE", se acuerda el desarrollo del sistema tecnológico conforme a los alcances, hitos y cronograma estipulados en esta propuesta por un valor total de {total_value}.

Ambas partes expresan su conformidad y aceptación de las fases del cronograma y el esquema de pagos detallados en esta propuesta, firmando digitalmente este documento en la localidad de {location}, el día {date}.`;
