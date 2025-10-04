import { useState } from "react";
import FrameworkDiagram from "./FrameworkDiagram";
import ChartRenderer from "./ChartRenderer";

export default function SlidePreview({ slides, isLoading, zoom = 1, optimizedStoryline, useMockData, setUseMockData, onGenerateMockSlides }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium">Generating your slides...</p>
      </div>
    );
  }

  if (!slides || slides.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No slides yet</h3>
        <p className="text-gray-500">Fill out the form and click "Generate Slides" to create your presentation</p>
        <button
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          onClick={() => {
            setUseMockData(true);
            if (onGenerateMockSlides) onGenerateMockSlides();
          }}
        >
          Generate Mock Slides
        </button>
      </div>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="space-y-6">
      {/* Storyline Overview */}
      {optimizedStoryline && optimizedStoryline.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimized Storyline</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {optimizedStoryline.map((point, index) => (
              <div key={index} className="bg-white border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{point}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linear Flow Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
            disabled={currentSlideIndex === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Previous</span>
          </button>

          <div className="flex-1 mx-6">
            <div className="flex items-center justify-center space-x-2">
              {slides.map((slide, index) => (
                <div key={slide.slide_number} className="flex items-center">
                  <button
                    onClick={() => setCurrentSlideIndex(index)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      index === currentSlideIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Slide {slide.slide_number}</div>
                      <div className="max-w-32 truncate">{slide.title}</div>
                    </div>
                  </button>
                  {index < slides.length - 1 && (
                    <svg className="w-4 h-4 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
            disabled={currentSlideIndex === slides.length - 1}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium">Next</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Current Slide */}
      <div id="slide-container"
        className="bg-white border border-gray-300 shadow-lg mx-auto origin-top overflow-hidden max-w-full"
        style={{ width: 1280 * zoom, height: 720 * zoom }}
      >
        {/* Linear Arrow Navigation - full width */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between w-full overflow-x-auto">
          {slides.map((slide, idx) => (
            <div key={slide.slide_number} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => setCurrentSlideIndex(idx)}
                className={`w-full px-3 py-1 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-0 truncate
                  ${idx === currentSlideIndex ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
                aria-current={idx === currentSlideIndex ? 'true' : undefined}
              >
                <span className="block font-bold">{slide.slide_number}</span>
                <span className="block truncate text-xs">{slide.title}</span>
              </button>
              {idx < slides.length - 1 && (
                <svg className="w-5 h-5 text-gray-400 mx-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Slide Content */}
  <div className="p-6 h-full flex flex-col max-w-full overflow-hidden">
          {/* Title Section */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentSlide.title}</h2>
            <div className="w-16 h-1 bg-blue-600"></div>
          </div>

          {/* Main Content Grid - dynamic layout */}
          <div
            className="flex-1 gap-6 max-w-full overflow-hidden"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gridTemplateAreas: `
                "topLeft topRight"
                "bottomLeft bottomRight"
              `,
            }}
          >
            {/* Chart Section */}
            {console.log("Current Slide Visualization:", currentSlide.visualization, "Data:", currentSlide)}
            <div
              className="flex flex-col items-center justify-center bg-white border border-gray-100 rounded-lg h-full w-full flex-grow"
              style={{ gridArea: currentSlide.layout?.chart || 'topLeft', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <div className="w-full flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{currentSlide.visualization}</span>
              </div>
              {/* Chart Enhancements */}
              {currentSlide.data && currentSlide.data.length > 0 ? (
                <div className="flex w-full h-64">
                  {/* Left-aligned chart */}
                  <div className="flex-shrink-0 w-1/2 h-full flex items-center justify-center">
                    {currentSlide.chart_image ? (
                      <img
                        src={currentSlide.chart_image}
                        alt={currentSlide.visualization}
                        className="max-h-56 w-auto object-contain rounded"
                      />
                    ) : (
                      <ChartRenderer
                        type={currentSlide.visualization}
                        data={currentSlide.data}
                        showAxes={true}
                        showLegend={true}
                        highlightPoints={true}
                      />
                    )}
                  </div>
                  {/* Related data on the right */}
                  <div className="flex-grow pl-4">
                    <div className="text-sm text-gray-700">
                      <p><strong>X-Axis:</strong> {currentSlide.chart_data.xAxisTitle || "Not available"}</p>
                      <p><strong>Y-Axis:</strong> {currentSlide.chart_data.yAxisTitle || "Not available"}</p>
                      <p><strong>Legend:</strong> {currentSlide.chart_data.legend || "Not available"}</p>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-800">Inferences</h4>
                      <ul className="list-disc list-inside text-xs text-gray-700">
                        {currentSlide.chart_data?.inferences?.map((inference, idx) => (
                          <li key={idx}>{inference}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex w-full h-64">
                  {/* Sample chart */}
                  <div className="flex-shrink-0 w-1/2 h-full flex items-center justify-center">
                    <ChartRenderer
                      type="Bar Chart"
                      data={[{ label: "Sample A", value: 50 }, { label: "Sample B", value: 75 }]}
                      showAxes={true}
                      showLegend={true}
                      highlightPoints={false}
                    />
                  </div>
                  {/* Instructions on the right */}
                  <div className="flex-grow pl-4">
                    <div className="text-sm text-gray-700">
                      <p><strong>Instructions:</strong></p>
                      <p>To create this chart, provide data points with labels and values. Ensure the X-axis represents categories and the Y-axis represents numerical values.</p>
                      <p>Example data format:</p>
                      <pre className="bg-gray-100 p-2 rounded text-xs">
                        {[
                          {"label": "Category 1", "value": 100},
                          {"label": "Category 2", "value": 75}
                        ]}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Key Insights */}
            <div
              className="grid grid-cols-2 gap-4 min-w-0 h-full w-full flex-grow"
              style={{ gridArea: currentSlide.layout?.keyInsights || 'bottomRight' }}
            >
              <div className="bg-blue-50 border-l-4 border-blue-500 p-3 overflow-auto max-h-24">
                <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Key Insight</h4>
                <p className="text-sm text-blue-900">{currentSlide.takeaway}</p>
              </div>
              <div className="bg-green-50 border-l-4 border-green-500 p-3 overflow-auto max-h-24">
                <h4 className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">Next Steps</h4>
                <p className="text-sm text-green-900">{currentSlide.call_to_action}</p>
              </div>
            </div>

            {/* Key Points */}
            <div
              className="bg-white border border-gray-200 rounded-lg p-4 overflow-auto h-full w-full flex-grow"
              style={{ gridArea: currentSlide.layout?.keyPoints || 'bottomLeft' }}
            >
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Key Points</h3>
              <ul className="space-y-2">
                {currentSlide.content.map((point, i) => (
                  <li key={i} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-xs text-gray-700 leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Frameworks */}
              <div
                className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto h-full w-full flex-grow"
                style={{ gridArea: currentSlide.layout?.frameworks || 'topRight' }}
              >
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3">Frameworks</h3>
                {currentSlide.frameworks && currentSlide.frameworks.length > 0 ? (
                  <div className="space-y-3">
                    {currentSlide.frameworks.map((framework, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded p-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          <span className="text-xs font-semibold text-gray-800">{framework}</span>
                        </div>
                        <div className="my-2">
                          <FrameworkDiagram framework={framework} frameworkData={currentSlide.framework_data ? currentSlide.framework_data[framework] : undefined} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">No frameworks suggested</p>
                )}
              </div>
            {/* Close grid layout */}
            </div>
          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>© Next Gen Consulting. All rights reserved.</span>
              <span>Confidential and Proprietary</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
