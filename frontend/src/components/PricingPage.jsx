import { useEffect } from "react";
import AOS from "aos";
import "aos/dist/aos.css";
import feather from "feather-icons";

export default function PricingPlans() {
    useEffect(() => {
        AOS.init({ duration: 800 });
        feather.replace();
    }, []);

    return (
        <div className="bg-gray-50 min-h-screen">
  <div className="container mx-auto px-4 py-16">
    {/* Header */}
    <div className="text-center mb-16" data-aos="fade-up">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Simple, transparent pricing
      </h1>
      <p className="text-xl text-gray-600 max-w-2xl mx-auto">
        Choose the perfect plan for your needs. No hidden fees, cancel anytime.
      </p>
    </div>

    {/* Pricing Cards */}
    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {/* Basic Card */}
      <div
        className="bg-white rounded-xl shadow-md p-8 pricing-card transition-all duration-300"
        data-aos="fade-up"
      >
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Basic</h3>
          <p className="text-gray-600">
            Ideal for students, case competition participants and occasional users.
          </p>
        </div>

        <div className="mb-8">
          <span className="text-4xl font-bold text-gray-900">₹10</span>
          <span className="text-gray-500">/coin</span>
        </div>

        <ul className="space-y-3 mb-8">
          <li className="flex items-center">
            <i data-feather="check" className="text-green-500 mr-2"></i>
            <span className="text-gray-700">1 slide per coin</span>
          </li>
          <li className="flex items-center text-gray-400">
            <i data-feather="x" className="mr-2"></i>
            <span>Priority support</span>
          </li>
        </ul>

        <button onClick={() => (window.location.href = '/buy-coins')} className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Get Started
        </button>
      </div>

      {/* Pro Card */}
      <div
        className="relative bg-white rounded-xl shadow-lg p-8 pricing-card transition-all duration-300 transform scale-105"
        data-aos="fade-up"
        data-aos-delay="100"
      >
        <div className="absolute popular-badge bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
          Popular
        </div>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Pro</h3>
          <p className="text-gray-600">Great for competitive case solvers</p>
        </div>
        <div className="mb-8">
          <span className="text-4xl font-bold text-gray-900">₹100</span>
          <span className="text-gray-500">/15 coins</span>
        </div>
        <ul className="space-y-3 mb-8">
          <li className="flex items-center">
            <i data-feather="check" className="text-green-500 mr-2"></i>
            <span className="text-gray-700">15 slides at the cost of 10</span>
          </li>
          <li className="flex items-center">
            <i data-feather="check" className="text-green-500 mr-2"></i>
            <span className="text-gray-700">Priority support</span>
          </li>
        </ul>
        <button onClick={() => (window.location.href = '/buy-coins')} className="w-full py-3 px-4 border border-transparent rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
          Get Started
        </button>
      </div>

      {/* Enterprise Card */}
      <div
        className="bg-white rounded-xl shadow-md p-8 pricing-card transition-all duration-300"
        data-aos="fade-up"
        data-aos-delay="200"
      >
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Enterprise</h3>
          <p className="text-gray-600">
            For teams and organizations that need scale and customization.
          </p>
        </div>
        <div className="mb-8">
          <span className="text-4xl font-bold text-gray-900">Custom</span>
        </div>
        <ul className="space-y-3 mb-8">
          <li className="flex items-center">
            <i data-feather="check" className="text-green-500 mr-2"></i>
            <span className="text-gray-700">Unlimited slides</span>
          </li>
          <li className="flex items-center">
            <i data-feather="check" className="text-green-500 mr-2"></i>
            <span className="text-gray-700">Dedicated support</span>
          </li>
        </ul>
        <button onClick={() => (window.location.href = '/buy-coins')} className="w-full py-3 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Contact Sales
        </button>
      </div>
    </div>
  </div>
</div>

  );
}
