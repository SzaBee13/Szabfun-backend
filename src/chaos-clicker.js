const { Server } = require("socket.io");

const CHAOS_EVENTS = [
  {
    name: "Server Lag",
    description: "Clicks are reversed and time cookies stop for 30 seconds!",
    type: "lag",
    duration: 30,
  },
  {
    name: "Great-Grandma",
    description: "2x time multiplier for 60 seconds!",
    type: "great-grandma",
    duration: 60,
  },
  {
    name: "Shaking Hands",
    description: "0.5 click multiplier for 60 seconds!",
    type: "shaking-hands",
    duration: 60,
  },
];

function setupChaosClicker(server) {
  const chaosClickerIo = new Server(server, {
    cors: { origin: "*" },
    path: "/chaos-clicker/socket.io",
  });

  const activeChaosEvents = new Set();

  setInterval(() => {
    for (const event of CHAOS_EVENTS) {
      if (!activeChaosEvents.has(event.type) && Math.random() < 0.25) {
        chaosClickerIo.emit("chaos-event", event);
        console.log(`Emitted event: ${event.name}`);
        activeChaosEvents.add(event.type);

        setTimeout(() => {
          activeChaosEvents.delete(event.type);
        }, event.duration * 1000);

        break; // Only one event per interval
      }
    }
  }, 5 * 60 * 1000); // 5 minutes

  // You can add more event listeners here if needed
}

module.exports = {
  setupChaosClicker,
  CHAOS_EVENTS,
};