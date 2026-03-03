import fetch from "node-fetch";
import nodemailer from "nodemailer";

// ----------------------------------------
// 1. FUENTE: Confs.tech API (España)
// ----------------------------------------
async function getConfsTech() {
  const url = "https://api.confs.tech/v1/conferences?country=Spain";
  const res = await fetch(url);
  const data = await res.json();

  return data.map(ev => ({
    nombre: ev.name || "Sin nombre",
    fecha: ev.startDate || "",
    ciudad: ev.location || "",
    precio: ev.price || "—",
    categoria: "Interesante",
    resumen: ev.description || "",
    link: ev.url || "",
    fuente: "Confs.tech"
  }));
}

// ----------------------------------------
// 2. FUENTE: Meetup (GraphQL)
// Requiere MEETUP_TOKEN en GitHub Secrets
// ----------------------------------------
async function getMeetup() {
  const query = {
    query: `
      query {
        findEvents(query: "tech madrid") {
          edges {
            node {
              title
              description
              dateTime
              eventUrl
              venue { city }
            }
          }
        }
      }
    `
  };

  const res = await fetch("https://api.meetup.com/gql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MEETUP_TOKEN}`
    },
    body: JSON.stringify(query)
  });

  const data = await res.json();
  const edges = data?.data?.findEvents?.edges || [];

  return edges.map(e => ({
    nombre: e.node.title,
    fecha: e.node.dateTime,
    ciudad: e.node.venue?.city || "Madrid",
    precio: "—",
    categoria: "Opcional",
    resumen: e.node.description || "",
    link: e.node.eventUrl,
    fuente: "Meetup"
  }));
}

// ----------------------------------------
// 3. GENERAR TABLA HTML (tu diseño aprobado)
// ----------------------------------------
function buildEmailTable(eventos) {
  return `
  <table border="1" cellspacing="0" cellpadding="6" style="border-collapse: collapse; width: 100%; font-family: Arial; font-size: 14px;">
    <thead style="background-color: #f2f2f2;">
      <tr>
        <th>Nombre</th>
        <th>Fecha</th>
        <th>Ciudad</th>
        <th>Precio</th>
        <th>Categoría</th>
        <th>Resumen</th>
        <th>Enlace</th>
        <th>Fuente</th>
      </tr>
    </thead>
    <tbody>
      ${eventos
        .map(
          ev => `
      <tr>
        <td><strong>${ev.nombre}</strong></td>
        <td>${ev.fecha}</td>
        <td>${ev.ciudad}</td>
        <td>${ev.precio}</td>
        <td>${ev.categoria}</td>
        <td>${ev.resumen}</td>
        <td><a href="${ev.link}" target="_blank">Ver evento</a></td>
        <td>${ev.fuente}</td>
      </tr>`
        )
        .join("")}
    </tbody>
  </table>
  `;
}

// ----------------------------------------
// 4. ENVIAR EMAIL
// Requiere SMTP_USER y SMTP_PASS en Secrets
// ----------------------------------------
async function sendEmail(html) {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: "TU_EMAIL_AQUI",
    subject: "Eventos diarios (Tech + Seguros)",
    html
  });
}

// ----------------------------------------
// 5. EJECUCIÓN COMPLETA
// ----------------------------------------
async function main() {
  console.log("→ Obteniendo eventos...");

  const confs = await getConfsTech();
  const meetup = await getMeetup();

  const eventos = [...confs, ...meetup];

  const html = buildEmailTable(eventos);

  console.log("→ Enviando email...");
  await sendEmail(html);

  console.log("→ Email enviado ✔");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
``
