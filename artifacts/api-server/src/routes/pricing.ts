import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { pickup, dropoff } = req.body;

    if (!pickup || !dropoff) {
      return res.status(400).json({
        error: "Pickup and dropoff required",
      });
    }

    const apiKey = process.env.OPENROUTE_API_KEY;

    // Geocode pickup
    const pickupGeo = await axios.get(
      "https://api.openrouteservice.org/geocode/search",
      {
        params: {
          api_key: apiKey,
          text: pickup,
        },
      }
    );

    // Geocode dropoff
    const dropoffGeo = await axios.get(
      "https://api.openrouteservice.org/geocode/search",
      {
        params: {
          api_key: apiKey,
          text: dropoff,
        },
      }
    );

    const pickupCoords =
      pickupGeo.data.features[0].geometry.coordinates;

    const dropoffCoords =
      dropoffGeo.data.features[0].geometry.coordinates;

    // Get route distance
    const route = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        coordinates: [pickupCoords, dropoffCoords],
      },
      {
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const meters =
      route.data.routes[0].summary.distance;

    const km = meters / 1000;

    // Pricing formula
    const baseFare = 25;
    const perKm = 8;

    const total =
      Math.round(baseFare + km * perKm);

    return res.json({
      distance_km: km.toFixed(1),
      price: total,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Pricing failed",
    });
  }
});

export default router;
