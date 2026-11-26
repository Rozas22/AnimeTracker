import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacidad y cookies',
  description: 'Qué datos usa KuramaTracker, para qué y cómo ejercer tus derechos.',
};

const UPDATED = '24 de noviembre de 2026';

const COOKIES: ReadonlyArray<{ name: string; purpose: string; duration: string }> = [
  { name: 'kurama_anilist_token', purpose: 'Mantener tu sesión con AniList', duration: 'Hasta que caduque la sesión o salgas' },
  { name: 'kurama_anilist_id', purpose: 'Identificar tu cuenta durante la sesión', duration: 'Igual que la sesión' },
  { name: 'kurama_anilist_name', purpose: 'Mostrar tu nombre en el menú', duration: 'Igual que la sesión' },
  { name: 'kurama_anilist_avatar', purpose: 'Mostrar tu avatar en el menú', duration: 'Igual que la sesión' },
  { name: 'kurama_oauth_state', purpose: 'Proteger el inicio de sesión', duration: '10 minutos' },
  { name: 'kurama_oauth_next', purpose: 'Volver a la página desde la que entraste', duration: '10 minutos' },
  { name: 'kurama_guest', purpose: 'Guardar tu partida del reto si juegas sin cuenta (identificador anónimo y distinto cada día)', duration: 'Hasta 1 hora después de acabar el día' },
  { name: 'kurama_no_metrics', purpose: 'Solo para el administrador: no contar sus propias visitas', duration: '1 año' },
  { name: 'kurama-frame-motion', purpose: 'Recordar tu preferencia de animación de marcos (almacenamiento local)', duration: 'Hasta que la cambies o borres los datos' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-slate-300 sm:text-base">{children}</div>
    </section>
  );
}

export default function PrivacidadPage(): React.JSX.Element {
  const owner = process.env.LEGAL_OWNER_NAME?.trim();
  const contact = process.env.LEGAL_CONTACT_EMAIL?.trim();

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:py-14">
      <article className="mx-auto w-full max-w-2xl space-y-9">
        <header className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver a KuramaTracker
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">Privacidad y cookies</h1>
          <p className="text-sm text-muted-foreground">Última actualización: {UPDATED}</p>
        </header>

        <Section title="Quién es responsable">
          {owner && contact ? (
            <p>
              El responsable de KuramaTracker es <b className="text-white">{owner}</b>. Para cualquier duda o solicitud sobre tus datos, escribe a{' '}
              <a href={`mailto:${contact}`} className="font-medium text-kurama underline underline-offset-2">{contact}</a>.
            </p>
          ) : (
            <p className="rounded-[12px] bg-[#e3b341]/10 px-4 py-3 text-[#e3b341]">Datos del responsable pendientes de completar.</p>
          )}
          <p>KuramaTracker es un proyecto independiente y no es un servicio oficial de AniList.</p>
        </Section>

        <Section title="Qué datos usamos">
          <ul className="list-disc space-y-2 pl-5">
            <li><b className="text-white">Cuenta de AniList:</b> identificador, nombre de usuario, avatar y el permiso de acceso que autorizas al entrar.</li>
            <li><b className="text-white">Actividad en la web:</b> nivel, puntos, trofeos, marco elegido, respuestas del quiz, partidas del reto y visibilidad del perfil.</li>
            <li><b className="text-white">Partida sin cuenta:</b> respuestas y puntuación del reto con un identificador anónimo. Se borra a los pocos días, salvo que la guardes en tu cuenta.</li>
            <li><b className="text-white">Ligas privadas:</b> nombre de la liga, miembros y puntos del reto.</li>
            <li><b className="text-white">Tu lista de anime:</b> se consulta en AniList, y tus cambios de progreso se guardan allí.</li>
            <li><b className="text-white">Notificaciones:</b> si las activas, guardamos los datos técnicos para enviarte avisos a ese dispositivo.</li>
          </ul>
        </Section>

        <Section title="Para qué los usamos">
          <p>
            Para darte el servicio que pides: iniciar sesión, seguir tu anime, jugar, calcular rankings y ligas, entregar premios y enviarte los avisos
            que actives. No vendemos tus datos ni los usamos para publicidad.
          </p>
        </Section>

        <Section title="Qué pueden ver otras personas">
          <p>
            Con el perfil público, otras personas pueden ver tu nombre de usuario, nivel, puntos, marco y trofeos. Si lo cambias a no público en Ajustes,
            esos datos dejan de mostrarse y en los rankings apareces como «Anónimo».
          </p>
          <p>
            En una liga privada, sus miembros ven tu nombre de usuario y tus puntos del reto. Si tu perfil no es público, apareces como «Miembro» y un número.
          </p>
          <p>No uses tu nombre real ni datos de contacto como nombre de usuario o nombre de liga.</p>
        </Section>

        <Section title="Estadísticas">
          <p>
            Contamos totales diarios (visitas, partidas, resultados compartidos, registros y ligas) para saber si el reto funciona. Estos totales no guardan
            quién hizo cada acción, ni tu IP, ni usan cookies. También calculamos de forma agregada cuántas cuentas vuelven a jugar a los 1, 7 y 30 días a
            partir de sus partidas. Los invitados no se siguen entre días. Los totales se conservan un máximo de 24 meses.
          </p>
        </Section>

        <Section title="Cookies y almacenamiento">
          <p>Solo usamos elementos técnicos, necesarios para el funcionamiento que solicitas. No usamos cookies de publicidad ni de analítica.</p>
          <div className="overflow-hidden rounded-[14px] bg-card">
            <ul className="divide-y divide-white/[0.06]">
              {COOKIES.map((c) => (
                <li key={c.name} className="space-y-1 p-4">
                  <code className="break-all text-xs font-semibold text-kurama">{c.name}</code>
                  <p className="text-sm text-white">{c.purpose}</p>
                  <p className="text-xs text-muted-foreground">{c.duration}</p>
                </li>
              ))}
            </ul>
          </div>
          <p>Si la web se instala como aplicación, también guarda archivos técnicos en el dispositivo para cargar más rápido.</p>
        </Section>

        <Section title="Con quién trabajamos">
          <p>
            Usamos <b className="text-white">AniList</b> (cuenta y datos de anime), <b className="text-white">Supabase</b> (base de datos) y{' '}
            <b className="text-white">Vercel</b> (alojamiento). Estos proveedores pueden tratar datos fuera del Espacio Económico Europeo.
          </p>
        </Section>

        <Section title="Cuánto tiempo los guardamos">
          <p>Conservamos los datos de tu cuenta mientras la uses o hasta que solicites su eliminación, salvo que debamos guardarlos por una obligación legal.</p>
        </Section>

        <Section title="Menores de edad">
          <p>
            Si tienes menos de 14 años, necesitas el consentimiento de tu madre, padre o tutor para crear una cuenta y usar los servicios que tratan tus
            datos. Si crees que un menor nos ha facilitado datos sin ese consentimiento, escríbenos para eliminarlos.
          </p>
        </Section>

        <Section title="Tus derechos">
          <p>
            Puedes solicitar el acceso, rectificación, supresión, oposición, limitación o portabilidad de tus datos en el contacto indicado arriba. Si no
            quedas conforme, puedes reclamar ante la{' '}
            <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="font-medium text-kurama underline underline-offset-2">
              Agencia Española de Protección de Datos
            </a>
            .
          </p>
        </Section>
      </article>
    </main>
  );
}
