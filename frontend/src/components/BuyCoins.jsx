import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

const BuyCoins = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    mobile: '',
    coins: 1,
  });
  const navigate = useNavigate();
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/buy_coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toast.success('In Process');
      setTimeout(() => navigate('/'), 1200);
    } catch (err) {
      toast.error('Failed to submit request');
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md mt-10">
      <Toaster />
      <h2 className="text-2xl font-bold mb-4 text-center">Buy Coins</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
          <input name="name" value={form.name} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Mobile</label>
          <input name="mobile" value={form.mobile} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Number of Coins</label>
          <input name="coins" type="number" min="1" value={form.coins} onChange={handleChange} required className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600">Send</button>
      </form>
    </div>
  );
};

export default BuyCoins;
