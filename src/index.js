export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Verificación del webhook de Meta
    if (request.method === "GET" && url.pathname === "/webhook") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === "fufu_webhook_2026") {
        console.log("Webhook verificado correctamente");
        return new Response(challenge, { status: 200 });
      }

      return new Response("Token de verificación incorrecto", {
        status: 403,
      });
    }

    // Recibir mensajes de WhatsApp
    if (request.method === "POST" && url.pathname === "/webhook") {
      try {
        const body = await request.json();

        const value = body.entry?.[0]?.changes?.[0]?.value;
        const message = value?.messages?.[0];

        // Meta también manda eventos que no son mensajes
        if (!message) {
          return new Response("EVENT_RECEIVED", { status: 200 });
        }

        const numeroCliente = message.from;

        console.log("Mensaje recibido de:", numeroCliente);
        console.log("Tipo:", message.type);

        // TEXTO
        if (message.type === "text") {
          const texto = message.text?.body || "";

          await enviarWhatsApp(
            env,
            numeroCliente,
            `🚗 FUFU Central\n\nHola 👋\nRecibí tu mensaje: "${texto}"\n\n📍 Envíame tu ubicación para solicitar un vehículo.`
          );
        }

        // UBICACIÓN
        else if (message.type === "location") {
          const lat = message.location?.latitude;
          const lng = message.location?.longitude;

          console.log(`Ubicación: ${lat}, ${lng}`);

          await enviarWhatsApp(
            env,
            numeroCliente,
            "📍 Ubicación recibida correctamente.\n\nAhora dime a dónde quieres ir."
          );
        }

        // AUDIO
        else if (message.type === "audio") {
          await enviarWhatsApp(
            env,
            numeroCliente,
            "🎙️ Recibí tu audio. Próximamente FUFU Central podrá procesar audios automáticamente."
          );
        }

        // OTROS
        else {
          await enviarWhatsApp(
            env,
            numeroCliente,
            "🚗 FUFU Central\n\nPara solicitar un vehículo, envíame tu ubicación 📍."
          );
        }

        return new Response("EVENT_RECEIVED", { status: 200 });
      } catch (error) {
        console.error("Error:", error);

        // Respondemos 200 para evitar reintentos innecesarios de Meta
        return new Response("EVENT_RECEIVED", { status: 200 });
      }
    }

    // Sirve para comprobar que el Worker está encendido
    return new Response("🚗 FUFU Central está funcionando.", {
      status: 200,
    });
  },
};

async function enviarWhatsApp(env, numero, mensaje) {
  const endpoint =
    `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${env.PHONE_NUMBER_ID}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",

    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: numero,

      type: "text",

      text: {
        preview_url: false,
        body: mensaje,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error enviando WhatsApp:", error);
  } else {
    console.log("WhatsApp enviado correctamente.");
  }
}
