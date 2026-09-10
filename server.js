const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v23.0";

/*
|--------------------------------------------------------------------------
| Página principal
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
    res.send("🚗 FUFU Central está funcionando.");
});

/*
|--------------------------------------------------------------------------
| Verificación del webhook de Meta
|--------------------------------------------------------------------------
*/

app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("✅ Webhook verificado correctamente.");
        return res.status(200).send(challenge);
    }

    console.log("❌ Error verificando webhook.");
    return res.sendStatus(403);
});

/*
|--------------------------------------------------------------------------
| Recibir mensajes de WhatsApp
|--------------------------------------------------------------------------
*/

app.post("/webhook", async (req, res) => {
    // Respondemos inmediatamente a Meta.
    res.sendStatus(200);

    try {
        const entry = req.body.entry?.[0];
        const change = entry?.changes?.[0];
        const value = change?.value;
        const message = value?.messages?.[0];

        if (!message) {
            return;
        }

        const numeroCliente = message.from;

        console.log("📩 Mensaje recibido");
        console.log("Cliente:", numeroCliente);
        console.log("Tipo:", message.type);

        /*
        |--------------------------------------------------------------------------
        | Mensaje de texto
        |--------------------------------------------------------------------------
        */

        if (message.type === "text") {
            const texto = message.text?.body || "";

            console.log("Mensaje:", texto);

            await enviarMensaje(
                numeroCliente,
                `🚗 *FUFU Central*\n\nHola 👋\n\nRecibí tu mensaje:\n"${texto}"\n\n📍 Para solicitar un vehículo, envíame tu ubicación.`
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Ubicación
        |--------------------------------------------------------------------------
        */

        if (message.type === "location") {
            const latitude = message.location?.latitude;
            const longitude = message.location?.longitude;

            console.log("📍 Ubicación:", latitude, longitude);

            await enviarMensaje(
                numeroCliente,
                `📍 *Ubicación recibida*\n\nPerfecto. Ahora dime a dónde quieres ir.`
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Audio
        |--------------------------------------------------------------------------
        */

        if (message.type === "audio") {
            console.log("🎙️ Audio recibido:", message.audio?.id);

            await enviarMensaje(
                numeroCliente,
                "🎙️ Recibí tu audio. Próximamente FUFU Central podrá procesarlo automáticamente."
            );

            return;
        }

        /*
        |--------------------------------------------------------------------------
        | Otros tipos
        |--------------------------------------------------------------------------
        */

        await enviarMensaje(
            numeroCliente,
            "🚗 Recibí tu mensaje. Para solicitar un vehículo puedes enviarme tu ubicación 📍."
        );

    } catch (error) {
        console.error(
            "Error procesando webhook:",
            error.response?.data || error.message
        );
    }
});

/*
|--------------------------------------------------------------------------
| Enviar mensaje por WhatsApp
|--------------------------------------------------------------------------
*/

async function enviarMensaje(numero, mensaje) {
    try {
        const url =
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

        const response = await axios.post(
            url,
            {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: numero,
                type: "text",
                text: {
                    preview_url: false,
                    body: mensaje
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(
            "✅ Mensaje enviado:",
            response.data.messages?.[0]?.id
        );

    } catch (error) {
        console.error(
            "❌ Error enviando WhatsApp:",
            error.response?.data || error.message
        );
    }
}

/*
|--------------------------------------------------------------------------
| Iniciar servidor
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
    console.log(`🚗 FUFU Central funcionando en puerto ${PORT}`);
});
