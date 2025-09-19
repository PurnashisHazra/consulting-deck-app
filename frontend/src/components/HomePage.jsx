import React from 'react';

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white shadow-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Made For Consultants</h1>
          <div className="space-x-6">
            <a href="/pricing" className="text-gray-600 hover:text-gray-800">Pricing</a>
            <a href="#demo" className="text-gray-600 hover:text-gray-800">Demo</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="bg-gradient-to-br from-blue-50 to-blue-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
            Create Stunning Consulting Decks in Minutes
          </h2>
          <p className="text-lg text-gray-700 mb-6">
            Leverage AI-powered frameworks and visualizations effortlessly.
          </p>
          <div className="space-x-4">
            <a
              href="/deck-generator"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </a>
            <a
              href="/login"
              className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
            >
              Sign Up
            </a>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Why Choose Pitch Mate?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <h4 className="text-xl font-semibold text-gray-800 mb-2">1000+ Consulting Frameworks</h4>
              <p className="text-gray-600">
                Generate data-driven slides with framework suggestions tailored to your needs.
              </p>
            </div>
            <div className="text-center">
              <h4 className="text-xl font-semibold text-gray-800 mb-2">500+ Visualizations</h4>
              <p className="text-gray-600">
                Get the best visualizations, charts and diagrams to effectively communicate your ideas.
              </p>
            </div>
            <div className="text-center">
              <h4 className="text-xl font-semibold text-gray-800 mb-2">Time-Saving</h4>
              <p className="text-gray-600">
                Create complete presentations in minutes, saving you hours of work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Slide Types Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white shadow-md rounded-lg p-6 text-center">
              <div className="w-full h-40 bg-gray-200 mb-4 flex items-center justify-center rounded">
                <img src="wholedeck.png" alt="Market Analysis" className="h-full object-contain"/>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-2">Competitive Decks</h4>
              <p className="text-gray-600 mb-4">
                Decks tailored to deliver compelling narratives for business competitions and pitches.
              </p>
             
            </div>

            {/* Card 2 */}
            <div className="bg-white shadow-md rounded-lg p-6 text-center">
              <div className="w-full h-40 bg-gray-200 mb-4 flex items-center justify-center rounded">
                <img src="Visuals.png" alt="Market Analysis" className="h-full object-contain"/>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-2">Detailed Visualizations</h4>
              <p className="text-gray-600 mb-4">
                Build valuation, forecasting, and ROI models in visually compelling formats.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white shadow-md rounded-lg p-6 text-center">
              <div className="w-full h-40 bg-gray-200 mb-4 flex items-center justify-center rounded">
                <img src="Frameworks.png" alt="Market Analysis" className="h-full object-contain"/>
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-2">Minimalistically Appealing</h4>
              <p className="text-gray-600 mb-4">
                Present strategic plans, milestones, and timelines with clarity and style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-sm">
            &copy; 2025 Pitch Mate. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
