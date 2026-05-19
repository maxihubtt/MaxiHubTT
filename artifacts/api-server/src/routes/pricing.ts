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
    if (!apiKey) {
      return res.status(503).json({ error: "Pricing service not configured (missing OPENROUTE_API_KEY)" });
    }

    // Force Trinidad search context
    const pickupSearch = `${pickup}, Trinidad and Tobago`;
    const dropoffSearch = `${dropoff}, Trinidad and Tobago`;

    // Geocode pickup
    const pickupGeo = await axios.get(
      "https://api.openrouteservice.org/geocode/search",
      {
        params: {
          api_key: apiKey,
          text: pickupSearch,
          boundary_country: "TT",
        },
      }
    );

    // Geocode dropoff
    const dropoffGeo = await axios.get(
      "https://api.openrouteservice.org/geocode/search",
      {
        params: {
          api_key: apiKey,
          text: dropoffSearch,
          boundary_country: "TT",
        },
      }
    );

    // Validate pickup result
    if (
      !pickupGeo.data.features ||
      pickupGeo.data.features.length === 0
    ) {
      return res.status(400).json({
        error: `Pickup location not found: ${pickup}`,
      });
    }

    // Validate dropoff result
    if (
      !dropoffGeo.data.features ||
      dropoffGeo.data.features.length === 0
    ) {
      return res.status(400).json({
        error: `Dropoff location not found: ${dropoff}`,
      });
    }

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

    // Optional long-distance multiplier
    let total = baseFare + km * perKm;

    // Late distance protection
    if (km > 25) {
      total += 20;
    }

    if (km > 50) {
      total += 40;
    }

    total = Math.round(total);

    return res.json({
      success: true,
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
