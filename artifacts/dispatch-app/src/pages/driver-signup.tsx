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

  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const res = await fetch("/api/drivers/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="p-6 text-center">
        Application submitted for approval.
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-4">

        <input
          placeholder="Full Name"
          className="w-full border p-3 rounded"
          onChange={(e) =>
            setForm({ ...form, full_name: e.target.value })
          }
        />

        <input
          placeholder="Phone"
          className="w-full border p-3 rounded"
          onChange={(e) =>
            setForm({ ...form, phone: e.target.value })
          }
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-3 rounded"
          onChange={(e) =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <input
          placeholder="Number Plate"
          className="w-full border p-3 rounded"
          onChange={(e) =>
            setForm({ ...form, number_plate: e.target.value })
          }
        />

        <input
          placeholder="DP Number"
          className="w-full border p-3 rounded"
          onChange={(e) =>
            setForm({ ...form, dp_number: e.target.value })
          }
        />

        <input
          placeholder="Taxi Badge Number"
          className="w-full border p-3 rounded"
          onChange={(e) =>
            setForm({ ...form, taxi_badge_number: e.target.value })
          }
        />

        <button
          type="submit"
          className="w-full bg-black text-white p-3 rounded"
        >
          Submit Application
        </button>

      </form>
    </div>
  );
}
