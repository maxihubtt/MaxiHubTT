import { useState } from "react";

export default function DriverSignup() {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    password: "",
    number_plate: "",
    dp_number: "",
    taxi_badge_number: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        "https://maxihubtt-api-9pav.onrender.com/drivers/signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      setMessage("Application submitted successfully!");

      setForm({
        full_name: "",
        phone: "",
        password: "",
        number_plate: "",
        dp_number: "",
        taxi_badge_number: "",
      });
    } catch (err) {
      console.error(err);
      setMessage("Server connection failed");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Driver Signup
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          placeholder="Full Name"
          className="w-full border p-3 rounded"
          value={form.full_name}
          onChange={(e) =>
            setForm({ ...form, full_name: e.target.value })
          }
        />

        <input
          placeholder="Phone Number"
          className="w-full border p-3 rounded"
          value={form.phone}
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded"
          value={form.password}
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <input
          placeholder="Vehicle Number Plate"
          className="w-full border p-3 rounded"
          value={form.number_plate}
          onChange={(e) =>
            setForm({ ...form, number_plate: e.target.value })
          }
        />

        <input
          placeholder="DP Number"
          className="w-full border p-3 rounded"
          value={form.dp_number}
          onChange={(e) =>
            setForm({ ...form, dp_number: e.target.value })
          }
        />

        <input
          placeholder="Taxi Badge Number"
          className="w-full border p-3 rounded"
          value={form.taxi_badge_number}
          onChange={(e) =>
            setForm({ ...form, taxi_badge_number: e.target.value })
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded"
        >
          {loading ? "Submitting..." : "Submit Application"}
        </button>

        {message && (
          <div className="text-center text-sm mt-4">
            {message}
          </div>
        )}

      </form>
    </div>
  );
}
