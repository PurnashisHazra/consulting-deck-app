import { useState } from "react";

export default function SlideForm({ onSubmit, isLoading }) {
  const [problem, setProblem] = useState("");
  const [storyline, setStoryline] = useState("");
  const [numSlides, setNumSlides] = useState(3);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      problem_statement: problem,
      storyline: storyline.split("\n").map(s=>s.trim()).filter(Boolean),
      num_slides: parseInt(numSlides),
      data: {
        Region: ["APAC", "EMEA", "NA"],
        Revenue: [100, 200, 300]
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Problem Statement */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Problem Statement
        </label>
        <textarea 
          value={problem} 
          onChange={(e)=>setProblem(e.target.value)} 
          placeholder="Describe the business problem or challenge..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          rows={4}
          required
        />
      </div>

      {/* Storyline */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Storyline (one per line)
        </label>
        <textarea 
          value={storyline} 
          onChange={(e)=>setStoryline(e.target.value)} 
          placeholder="Enter key points for your presentation, one per line..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
          rows={6}
          required
        />
      </div>

      {/* Number of Slides */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Number of Slides
        </label>
        <input 
          type="number" 
          min="1" 
          max="20"
          value={numSlides} 
          onChange={(e)=>setNumSlides(e.target.value)} 
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          required
        />
      </div>

      {/* Submit Button */}
      <button 
        type="submit"
        disabled={isLoading || !problem.trim() || !storyline.trim()}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Generating Slides...</span>
          </div>
        ) : (
          "Generate Slides"
        )}
      </button>
    </form>
  );
}
