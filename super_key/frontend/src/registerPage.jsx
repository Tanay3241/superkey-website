import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "./config/firebase";

const RegisterPage = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "retailer", // default role, change as needed
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Register with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );
      const idToken = await userCredential.user.getIdToken();
      console.log("idToken", idToken);

      // Send data to backend
      const response = await fetch("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          idToken,
          name: form.name,
          phone: form.phone,
          role: form.role,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("Registration successful!");
        // Redirect or update UI as needed
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <div>
          <label>Email:</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            autoFocus
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Name:</label>
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Phone:</label>
          <input
            name="phone"
            type="text"
            value={form.phone}
            onChange={handleChange}
            required
          />
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Role:</label>
          <select name="role" value={form.role} onChange={handleChange} required>
            <option value="super_admin">Super Admin</option>
            <option value="super_distributor">Super Distributor</option>
            <option value="distributor">Distributor</option>
            <option value="retailer">Retailer</option>
          </select>
        </div>
        {error && <div className="error-message">{error}</div>}
        <button type="submit" disabled={loading}>
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
