export type Country = {
  code: string;
  name: string;
  flag: string;
  currency: string;
  timezone: string;
};

export const countries: Country[] = [
  { code: "AR", name: "Argentina", flag: "🇦🇷", currency: "ARS", timezone: "America/Argentina/Buenos_Aires" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴", currency: "BOB", timezone: "America/La_Paz" },
  { code: "BR", name: "Brasil", flag: "🇧🇷", currency: "BRL", timezone: "America/Sao_Paulo" },
  { code: "CA", name: "Canadá", flag: "🇨🇦", currency: "CAD", timezone: "America/Toronto" },
  { code: "CL", name: "Chile", flag: "🇨🇱", currency: "CLP", timezone: "America/Santiago" },
  { code: "CO", name: "Colombia", flag: "🇨🇴", currency: "COP", timezone: "America/Bogota" },
  { code: "CR", name: "Costa Rica", flag: "🇨🇷", currency: "CRC", timezone: "America/Costa_Rica" },
  { code: "CU", name: "Cuba", flag: "🇨🇺", currency: "CUP", timezone: "America/Havana" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴", currency: "DOP", timezone: "America/Santo_Domingo" },
  { code: "EC", name: "Ecuador", flag: "🇪🇨", currency: "USD", timezone: "America/Guayaquil" },
  { code: "SV", name: "El Salvador", flag: "🇸🇻", currency: "USD", timezone: "America/El_Salvador" },
  { code: "ES", name: "España", flag: "🇪🇸", currency: "EUR", timezone: "Europe/Madrid" },
  { code: "US", name: "Estados Unidos", flag: "🇺🇸", currency: "USD", timezone: "America/New_York" },
  { code: "GT", name: "Guatemala", flag: "🇬🇹", currency: "GTQ", timezone: "America/Guatemala" },
  { code: "HN", name: "Honduras", flag: "🇭🇳", currency: "HNL", timezone: "America/Tegucigalpa" },
  { code: "MX", name: "México", flag: "🇲🇽", currency: "MXN", timezone: "America/Mexico_City" },
  { code: "NI", name: "Nicaragua", flag: "🇳🇮", currency: "NIO", timezone: "America/Managua" },
  { code: "PA", name: "Panamá", flag: "🇵🇦", currency: "PAB", timezone: "America/Panama" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾", currency: "PYG", timezone: "America/Asuncion" },
  { code: "PE", name: "Perú", flag: "🇵🇪", currency: "PEN", timezone: "America/Lima" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", currency: "GBP", timezone: "Europe/London" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾", currency: "UYU", timezone: "America/Montevideo" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪", currency: "VES", timezone: "America/Caracas" },
];

export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code);
}

export function detectCountry(): Country | undefined {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const match = countries.find((c) => c.timezone === tz);
  if (match) return match;
  const region = tz.split("/")[0];
  return countries.find((c) => c.timezone.startsWith(region));
}

export function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function detectCurrency(): string {
  const country = detectCountry();
  return country?.currency ?? "USD";
}