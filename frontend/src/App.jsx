import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import SlideForm from "./components/SlideForm";
import SlidePreview from "./components/SlidePreview";
import CanvasSlidePreview from "./components/CanvasSlidePreview";
import { generateSlides, API_BASE_URL, fetchSavedDecks } from "./api";
import LoginSignup from "./components/LoginSignup";
import HomePage from "./components/HomePage";
import PricingPage from "./components/PricingPage";
import BuyCoins from "./components/BuyCoins";
import toast, { Toaster } from 'react-hot-toast';
import ReactGA from 'react-ga4';
const TRACKING_ID = "G-94GTC11LBH"; 
// Mock data for testing layout
// Auth Context for best practices
export const AuthContext = createContext();

const mockResponse = {
    "optimized_storyline": [
        "Valuation Comparables",
        "Options Assessment",
        "Recommendation"
    ],
    "context_analysis": {},
    "slides": [
        {
            "slide_number": 1,
            "title": "Valuation Comparables",
            "slide_archetype": "Data Chart",
            "layout": {
                "rows": 2,
                "columns": 2
            },
            "sections": [
                {
                    "row": 1,
                    "col": 1,
                    "title": "Recent Comparable Transactions",
                    "content": "Overview of recent SaaS transactions to establish valuation benchmarks.",
                    "charts": [
                        "Bar Chart"
                    ],
                    "frameworks": [],
                    "framework_data": [],
                    "infographics": [],
                    "chart_data": {
                        "Bar Chart": {
                            "xAxisTitle": "Company",
                            "yAxisTitle": "Valuation ($B)",
                            "legend": "Recent Comparable Transactions",
                            "inferences": [
                                "CloudEdge Inc. achieved the highest valuation among recent transactions.",
                                "FinOps Ltd. raised significant capital in its Series D round, indicating strong investor interest."
                            ],
                            "labels": [
                                "CloudEdge Inc. (IPO)",
                                "DataSphere Co. (Acquisition)",
                                "FinOps Ltd. (Series D)",
                                "AppStream AG (IPO)"
                            ],
                            "values": [
                                3.2,
                                2.8,
                                1.5,
                                2.0
                            ]
                        }
                    }
                },
                {
                    "row": 1,
                    "col": 2,
                    "title": "Valuation Multiples",
                    "content": "SaaS industry average EV/Revenue multiple: 6.5x; High-growth SaaS (CAGR >25%): 8-10x.",
                    "charts": [
                        "Bar Chart"
                    ],
                    "frameworks": [],
                    "framework_data": [],
                    "infographics": [],
                    "chart_data": {
                        "Bar Chart": {
                            "xAxisTitle": "Company/Category",
                            "yAxisTitle": "EV/Revenue Multiple (x)",
                            "legend": "Valuation Multiples Comparison",
                            "inferences": [
                                "High-growth SaaS companies command higher multiples.",
                                "Recent IPOs have varied valuations, reflecting market conditions.",
                                "TechNova Ltd. could leverage its growth to achieve a favorable valuation."
                            ],
                            "labels": [
                                "SaaS Industry Average",
                                "High-Growth SaaS (CAGR >25%)",
                                "CloudEdge Inc. (IPO)",
                                "DataSphere Co. (Acquisition)",
                                "FinOps Ltd. (Series D)",
                                "AppStream AG (IPO)"
                            ],
                            "values": [
                                6.5,
                                9.0,
                                8.5,
                                7.0,
                                9.0,
                                6.8
                            ]
                        }
                    }
                },
                {
                    "row": 2,
                    "col": 1,
                    "title": "Client Valuation Estimate",
                    "content": "Estimated valuation based on revenue and EBITDA margin: Valuation = Revenue x EV/Revenue multiple.",
                    "charts": [
                        "Waterfall Chart"
                    ],
                    "frameworks": [],
                    "framework_data": [],
                    "infographics": [],
                    "chart_data": {
                        "Waterfall Chart": {
                            "xAxisTitle": "Valuation Steps",
                            "yAxisTitle": "Valuation ($M)",
                            "legend": "Valuation Components",
                            "inferences": [
                                "The revenue growth significantly impacts the overall valuation.",
                                "EBITDA margin improvements contribute positively to net income.",
                                "Net debt adjustment reduces the final valuation."
                            ],
                            "labels": [],
                            "values": [
                                420,
                                540,
                                710,
                                930,
                                76.2,
                                140,
                                -120,
                                3.6
                            ]
                        }
                    }
                },
                {
                    "row": 2,
                    "col": 2,
                    "title": "Market Trends",
                    "content": "Recent IPOs show a 15-20% discount compared to private placements.",
                    "charts": [
                        "Line Chart"
                    ],
                    "frameworks": [],
                    "framework_data": [],
                    "infographics": [],
                    "chart_data": {
                        "Line Chart": {
                            "xAxisTitle": "Valuation Type",
                            "yAxisTitle": "Valuation ($B)",
                            "legend": "Valuation Comparables",
                            "inferences": [
                                "Recent IPOs show a 15-20% discount compared to private placements.",
                                "The average valuation for recent IPOs is lower than private placements."
                            ],
                            "labels": [
                                "Recent IPOs",
                                "Private Placements"
                            ],
                            "values": [
                                2.0,
                                2.5
                            ]
                        }
                    }
                }
            ],
            "visualization": "Bar Chart",
            "frameworks": [],
            "content": [
                "Recent comparable transactions indicate a strong market for SaaS IPOs, with valuations reflecting growth potential.",
                "The average EV/Revenue multiple for high-growth SaaS companies is significantly higher than the industry average, suggesting TechNova could command a premium.",
                "Client's projected revenue growth (CAGR of 28%) positions it favorably for an IPO or acquisition."
            ],
            "takeaway": "TechNova's valuation can be optimized through strategic timing and choice of funding mechanism.",
            "call_to_action": "Consider positioning for an IPO within the next 18 months to maximize valuation.",
            "executive_summary": "TechNova's valuation is strong, supported by industry comparables and growth metrics. Strategic options include IPO or acquisition.",
            "detailed_analysis": "Analysis of recent transactions and market multiples indicates a favorable environment for TechNova's growth capital raise or IPO.",
            "methodology": "Data collected from market reports and financial analyses of comparable SaaS companies.",
            "data": [
                {
                    "source": "PitchBook, SaaS Valuation Trends 2023"
                },
                {
                    "source": "CB Insights, SaaS Market Analysis 2023"
                }
            ],
            "framework_data": {}
        },
        {
            "slide_number": 2,
            "title": "Options Assessment",
            "slide_archetype": "Comparison",
            "layout": {
                "rows": 2,
                "columns": 2
            },
            "sections": [
                {
                    "row": 1,
                    "col": 1,
                    "title": "Funding Options",
                    "content": "1. Series D funding: Quick capital raise, less dilution.\n2. IPO: Higher valuation, market visibility.\n3. Acquisition: Immediate liquidity, strategic fit.",
                    "charts": [
                        "Decision Matrix (Weighted Scoring)"
                    ],
                    "frameworks": [
                        "SWOT Analysis"
                    ],
                    "framework_data": [
                        {
                            "SWOT Analysis": {
                                "Strengths": [
                                    "Quick capital raise with Series D funding",
                                    "Less dilution of ownership",
                                    "Higher valuation and market visibility with IPO",
                                    "Immediate liquidity through acquisition",
                                    "Strategic fit with acquisition"
                                ],
                                "Weaknesses": [
                                    "Potential pressure to perform quickly with Series D funding",
                                    "High costs and regulatory requirements for IPO",
                                    "Risk of losing control in acquisition",
                                    null,
                                    null
                                ],
                                "Opportunities": [
                                    "Access to new investors through Series D funding",
                                    "Increased brand recognition from IPO",
                                    "Expansion opportunities through strategic acquisitions",
                                    null,
                                    null
                                ],
                                "Threats": [
                                    "Market volatility affecting IPO success",
                                    "Competitive landscape may impact acquisition negotiations",
                                    "Dilution of brand value if acquisition is not well-received",
                                    null,
                                    null
                                ]
                            }
                        }
                    ],
                    "infographics": [],
                    "chart_data": {
                        "Decision Matrix (Weighted Scoring)": {
                            "xAxisTitle": "Funding Options",
                            "yAxisTitle": "EV/Revenue Multiple",
                            "legend": "Valuation Metrics",
                            "inferences": [
                                "Series D funding has the highest EV/Revenue multiple indicating strong investor interest.",
                                "IPO provides significant market visibility but comes with a valuation discount.",
                                "Acquisition offers immediate liquidity but at a lower multiple compared to other options."
                            ],
                            "labels": [],
                            "values": []
                        }
                    }
                },
                {
                    "row": 1,
                    "col": 2,
                    "title": "Pros and Cons",
                    "content": "Pros: \n- Series D: Faster access to funds.\n- IPO: Potential for high valuation.\n- Acquisition: Immediate exit.\nCons:\n- Series D: More investor scrutiny.\n- IPO: Market volatility risk.\n- Acquisition: Loss of control.",
                    "charts": [
                        "Matrix Chart"
                    ],
                    "frameworks": [],
                    "framework_data": [],
                    "infographics": [],
                    "chart_data": {
                        "Matrix Chart": {
                            "xAxisTitle": "Options",
                            "yAxisTitle": "Count",
                            "legend": "Pros and Cons",
                            "inferences": [
                                "IPO has the highest potential for valuation but comes with significant market risks.",
                                "Series D offers faster access to funds but increases scrutiny from investors.",
                                "Acquisition provides an immediate exit but results in loss of control."
                            ],
                            "labels": [],
                            "values": []
                        }
                    }
                },
                {
                    "row": 2,
                    "col": 1,
                    "title": "Financial Implications",
                    "content": "Projected revenue growth post-funding: Series D: $540M; IPO: $710M; Acquisition: $930M.",
                    "charts": [
                        "Line Chart"
                    ],
                    "frameworks": [],
                    "framework_data": [],
                    "infographics": [],
                    "chart_data": {
                        "Line Chart": {
                            "xAxisTitle": "Funding Options",
                            "yAxisTitle": "Projected Revenue Growth ($M)",
                            "legend": "Projected Revenue Growth Post-Funding",
                            "inferences": [
                                "Acquisition offers the highest projected revenue growth.",
                                "IPO provides a significant revenue increase compared to Series D.",
                                "Series D funding shows a solid growth trajectory but is the lowest among options."
                            ],
                            "labels": [
                                "Series D",
                                "IPO",
                                "Acquisition"
                            ],
                            "values": [
                                540,
                                710,
                                930
                            ]
                        }
                    }
                },
                {
                    "row": 2,
                    "col": 2,
                    "title": "Market Positioning",
                    "content": "Evaluate market conditions and investor sentiment to determine optimal timing for IPO or acquisition.",
                    "charts": [
                        "Heatmap"
                    ],
                    "frameworks": [
                        "Porter's Five Forces"
                    ],
                    "framework_data": [
                        {
                            "Porter's Five Forces": {
                                "Competitive Rivalry": [
                                    "High competition among existing players",
                                    "Market saturation leading to price wars",
                                    "Innovation as a key differentiator"
                                ],
                                "Supplier Power": [
                                    "Limited number of suppliers for critical components",
                                    "Suppliers hold significant bargaining power",
                                    "Potential for vertical integration"
                                ],
                                "Buyer Power": [
                                    "Increasing buyer awareness and price sensitivity",
                                    "Availability of alternative products",
                                    "Buyers can easily switch to competitors"
                                ],
                                "Threat of Substitution": [
                                    "Emergence of new technologies offering similar solutions",
                                    "Changing consumer preferences towards alternative products",
                                    "Low switching costs for consumers"
                                ],
                                "Threat of New Entry": [
                                    "Barriers to entry are moderate, allowing new competitors",
                                    "Potential for new entrants to disrupt the market",
                                    "Established brands have strong customer loyalty"
                                ]
                            }
                        }
                    ],
                    "infographics": [],
                    "chart_data": {
                        "Heatmap": {
                            "xAxisTitle": "Years",
                            "yAxisTitle": "Revenue ($M)",
                            "legend": "Projected Revenue Growth",
                            "inferences": [
                                "Revenue is expected to grow significantly over the next three years.",
                                "EBITDA margin is improving, indicating better profitability."
                            ],
                            "labels": [],
                            "values": []
                        }
                    }
                }
            ],
            "visualization": "Decision Matrix",
            "frameworks": [
                "SWOT Analysis",
                "Porter's Five Forces"
            ],
            "content": [
                "Each funding option presents unique advantages and challenges that must be carefully weighed.",
                "Financial projections indicate significant revenue growth potential, particularly with an IPO.",
                "Market conditions favor a strategic approach to funding, with investor sentiment leaning towards high-growth SaaS companies."
            ],
            "takeaway": "A thorough assessment of funding options reveals that an IPO may yield the highest valuation, but each option has strategic merits.",
            "call_to_action": "Engage stakeholders to discuss the preferred funding strategy moving forward.",
            "executive_summary": "TechNova has three viable options for growth capital: Series D funding, IPO, or acquisition. Each option has distinct financial implications and market positioning considerations.",
            "detailed_analysis": "The analysis compares the pros and cons of each funding option, supported by financial projections and market conditions.",
            "methodology": "Data sourced from financial forecasts and market analysis reports, with a comparative analysis framework applied.",
            "data": [
                {
                    "source": "MarketWatch, SaaS Funding Trends 2023"
                },
                {
                    "source": "Forbes, IPO Market Analysis 2023"
                }
            ],
            "framework_data": {}
        }
    ],
    "recommendations": [
        "Pursue an IPO within 18 months to maximize valuation based on current market conditions.",
        "Consider Series D funding as a backup option to maintain flexibility in capital raising.",
        "Evaluate acquisition offers carefully to ensure alignment with long-term strategic goals."
    ],
    "problem_statement": "You are part of the Investment Banking division at a global firm.\nYour client is TechNova Ltd., a mid-sized SaaS company operating in enterprise cloud solutions. They are seeking advice on strategic options:\n\nRaise growth capital via private placement (Series D round)\n\nPursue an IPO in the next 18 months\n\nExplore acquisition by a larger tech player\n\nYour task is to evaluate these options and recommend the best path forward.\n\nCompany Profile\n\nRevenue (FY 2024): $420M\n\nRevenue Growth (3yr CAGR): 28%\n\nEBITDA Margin: 18%\n\nNet Debt: $120M\n\nCash Balance: $60M\n\nHeadcount: 2,100\n\nMarket Data\n\nSaaS industry average EV/Revenue multiple: 6.5x\n\nHigh-growth SaaS (>25% CAGR) EV/Revenue multiple: 8–10x\n\nMedian IPO size (recent SaaS IPOs): $250M\n\nAvg IPO valuation discount (vs. private placement): 15–20%\n\nRecent Comparable Transactions\nCompany\tDeal Type\tValuation ($B)\tEV/Revenue Multiple\tNotes\nCloudEdge Inc.\tIPO (2024)\t3.2\t8.5x\tRaised $300M, priced at upper range\nDataSphere Co.\tAcquisition\t2.8\t7.0x\tBought by Oracle for strategic fit\nFinOps Ltd.\tSeries D\t1.5\t9.0x\tRaised $200M from PE investor\nAppStream AG\tIPO (2023)\t2.0\t6.8x\tPriced below expectations, post-drop -18%\nClient’s Financial Projections\nMetric\tFY 2025E\tFY 2026E\tFY 2027E\nRevenue ($M)\t540\t710\t930\nEBITDA Margin (%)\t19%\t21%\t23%\nNet Income ($M)\t55\t92\t140"
}
;


// AuthProvider wraps the app and provides auth state
export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("token"));
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Keep localStorage and state in sync
  useEffect(() => {
    if (isAuthenticated) {
      if(!!token){
        localStorage.removeItem("token");
      }
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [isAuthenticated, token]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated, token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ isAuthenticated, children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login first!');
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  return isAuthenticated ? children : null;
}

function App() {
  const [slides, setSlides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [optimizedStoryline, setOptimizedStoryline] = useState([]);
  const [useMockData, setUseMockData] = useState(false);
  const [userName, setUserName] = useState("User");
  const [userCoins, setUserCoins] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated, token, setToken } = useContext(AuthContext);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  const [savedDecks, setSavedDecks] = useState([]);
  const [showSavedDecksDropdown, setShowSavedDecksDropdown] = useState(false);
  // Fetch user name if authenticated
  useEffect(() => {
    
    const fetchUserName = async () => {
      
        try {
          const response = await fetch(`${API_BASE_URL}/auth/user`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUserName("Hi " + data.name);
            setUserCoins(data.coins ?? 0);
            // fetch saved decks
            try {
              const decksRes = await fetchSavedDecks(token);
              setSavedDecks(decksRes.decks || []);
            } catch (err) {
              console.warn('Failed to fetch saved decks', err);
            }
          } else if (response.status === 401) {
            const errorData = await response.json();
            if (errorData.detail === "Token has expired. Please log in again.") {
              setToken(null);
              setIsAuthenticated(false);
              setTimeout(() => navigate("/login", { replace: true }), 0);
            }
          }
        } catch (error) {
          console.error("Failed to fetch user name", error);
        }
      
    };
    if (isAuthenticated) {
      fetchUserName();
    }
  }, [isAuthenticated, token, setIsAuthenticated, setToken, navigate]);

  useEffect(() => {
        ReactGA.initialize(TRACKING_ID);
        // Send pageview with a custom path
        ReactGA.send({ hitType: "pageview", page: "/mainpage", title: "Main Page" });
    }, []);
  const handleLogout = () => {
      // 1. Remove token (replace 'authToken' with your token key)
      localStorage.removeItem("token");
      // or sessionStorage.removeItem("authToken");

      // 2. Redirect to home page
      navigate("/");
    };

  const handleSubmit = async (payload) => {
    setIsLoading(true);
    try {
      // Check if user has at least 1 coin before generating slides
      if (userCoins < 1) {
        toast.error('You do not have enough coins to generate a slide.');
        //alert('You do not have enough coins to generate a slide.');
        setIsLoading(false);
        return;
      }
      if (useMockData) {
        setTimeout(() => {
          setSlides(mockResponse.slides);
          setOptimizedStoryline(mockResponse.optimized_storyline);
          setIsLoading(false);
        }, 1000);
      } else {
        //Check if user has enough coins to generate that #slides
        if (payload.num_slides > userCoins) {
          toast.error(`You do not have enough coins to generate ${payload.num_slides} slides. You have ${userCoins} coins.`);
          //alert(`You do not have enough coins to generate ${payload.num_slides} slides. You have ${userCoins} coins.`);
          setIsLoading(false);
          return;
        }
         // Pass token or other user details if needed
        const result = await generateSlides(payload, token);
        setSlides(result.slides);
        setOptimizedStoryline(result.optimized_storyline || []);
        // Consume a coin after successful slide generation
  const consumeRes = await fetch(`${API_BASE_URL}/auth/consume_coin`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ num_slides: payload.num_slides })
        });
        if (consumeRes.ok) {
          const data = await consumeRes.json();
          setUserCoins(data.coins);
        } else {
          const err = await consumeRes.json();
          alert(err.detail || 'Failed to consume coin');
        }
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error generating slides');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      {/* <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Consulting Deck Generator
            </h1>
            <p className="text-lg text-gray-600">
              Create professional presentation slides with AI-powered insights
            </p>
          </div>
        </div>
      </div> */}
    <Toaster />

      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <img
                src="Logo2.png" // <-- replace with your logo path
                alt="Brand Logo"
                className="h-10 w-10 mr-3"
              />
              <h1 className="text-4xl font-bold text-gray-900">
                Pitch Mate
              </h1>
            </div>
            <p className="text-lg text-gray-600">
              AI-Driven Decks for Smarter Consulting
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <Routes>
          <Route
            path="/"
            element={<HomePage />}
          />
          <Route
            path="/"
            element={<PricingPage />}
          />
          <Route
            path="/login"
            element={
              isAuthenticated && token ? (
                <Navigate to="/deck-generator" />
              ) : (
                <LoginSignup />
              )
            }
          />
          <Route
            path="/deck-generator"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <div>
                  {/* Header with Profile Icon */}
                  {/* <div className="bg-white shadow-sm border-b flex justify-between items-center px-6 py-4">
                    <h1 className="text-2xl font-bold text-gray-900">Deck Generator</h1>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-700">{userName} <span className="font-bold">{userName.charAt(0)}</span><span className="ml-2 text-yellow-500 font-semibold">{userCoins} 🪙</span></span>
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                        
                      </div>
                    </div>
                  </div> */}
                  <div className="bg-white shadow-sm border-b flex justify-between items-center px-6 py-4 mb-6">
                        <nav className="hidden md:flex space-x-6">
                          <a href="/" className="text-gray-700 hover:text-blue-600">
                            Home
                          </a>
  
                          <a href="/pricing" className="text-gray-700 hover:text-blue-600">
                            Pricing
                          </a>
                        </nav>

                    <div className="flex items-center space-x-4">
                    {/* User name pill */}
                    <div className="relative">
                      <div
                        onClick={() => setShowUserDropdown((prev) => !prev)}

                        className="flex items-center space-x-2 bg-white border border-blue-500 rounded-full px-3 py-1
                        hover:bg-blue-50 transition-colors duration-200 cursor-pointer"
                      >
                        <span className="text-gray-800 font-medium">{userName}</span>
                        <span className="w-6 h-6 flex items-center justify-center bg-blue-500 text-white rounded-full font-bold">
                          {userName.charAt(3)}
                        </span>
                      </div>

                      {/* User dropdown */}
                      {showUserDropdown && (
                        <div
                          className="absolute right-0 mt-2 w-36 bg-white border rounded-lg shadow-lg py-2 z-50"

                        >
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Logout
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Coins pill */}
                    <div className="relative">
                      <div
                        onClick={() => setShowCoinDropdown((prev) => !prev)}
          
                        className={`flex items-center space-x-1 rounded-full px-3 py-1 border transition-colors duration-200 cursor-pointer 
                          ${userCoins < 5
                            ? 'border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                            : 'border-blue-500 text-blue-600 hover:bg-blue-50'
                          } bg-white`}
                      >
                        <span className="font-semibold">{userCoins}</span>
                        <span className="text-lg">
                          <span className="w-4 h-4">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="w-4 h-4"
                              fill="none"
                              stroke="black"
                              strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <rect x="9" y="9" width="6" height="6" stroke="black" fill="none" strokeWidth="2" />
                            </svg>
                          </span>
                        </span>
                      </div>

                      {/* Coin dropdown */}
                      {showCoinDropdown && (
                        <div
                          className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg py-2 z-50"

                        >
                          <a
                            href="/buy-coins"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Buy Coins
                          </a>
                          
                        </div>
                      )}
                    </div>
                  </div>
                  </div>

                  {/* Form Section (wider horizontally) */}
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-semibold text-gray-900">
                        Generate Your Deck
                      </h2>
                    </div>
                    <div className="max-w-5xl">
                      <SlideForm onSubmit={handleSubmit} isLoading={isLoading} />
                    </div>
                  </div>
                  {/* Slides Section (below form) */}
                  <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-semibold text-gray-900">Generated Slides</h2>
                      <div className="flex items-center gap-2">
                      {/* Saved Decks Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setShowSavedDecksDropdown(v => !v)}
                          className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-50"
                        >
                          Saved decks
                        </button>
                        {showSavedDecksDropdown && (
                          <div className="absolute right-0 mt-2 w-64 bg-white border rounded-lg shadow-lg py-2 z-50 max-h-72 overflow-auto">
                            {savedDecks.length === 0 ? (
                              <div className="px-4 py-2 text-sm text-gray-500">No saved decks</div>
                            ) : (
                              savedDecks.map((d, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    // Load the saved deck into the canvas
                                    try {
                                      const deck = d.deck || d;
                                      setSlides(deck.slides || []);
                                      setOptimizedStoryline(deck.optimized_storyline || []);
                                      setShowSavedDecksDropdown(false);
                                    } catch (e) {
                                      console.error('Failed to load deck', e);
                                    }
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                                >
                                  <div className="font-medium">{d.deck?.slides?.[0]?.title || d.title || 'Untitled'}</div>
                                  <div className="text-xs text-gray-500">{new Date(d.created_at).toLocaleString()}</div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                        {/* <button
                          onClick={() => {
                            setSlides(mockResponse.slides);
                            setOptimizedStoryline(mockResponse.optimized_storyline);
                          }}
                          className="px-3 py-1 border rounded text-sm bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Generate Mock Slides
                        </button> */}
                        <button
                          onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                          className="px-3 py-1 border rounded text-sm"
                          aria-label="Zoom out"
                        >
                          −
                        </button>
                        <span className="text-sm w-14 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                          onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}
                          className="px-3 py-1 border rounded text-sm"
                          aria-label="Zoom in"
                        >
                          +
                        </button>
                        <button
                          onClick={() => setZoom(1)}
                          className="ml-2 px-3 py-1 border rounded text-sm"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    {/* <SlidePreview
                      slides={slides}
                      isLoading={isLoading}
                      zoom={zoom}
                      optimizedStoryline={optimizedStoryline}
                      useMockData={useMockData}
                      setUseMockData={setUseMockData}
                      currentSlideIndex={currentSlideIndex}
                      setCurrentSlideIndex={setCurrentSlideIndex}
                      onGenerateMockSlides={() => {
                        setUseMockData(true);
                        setSlides(mockResponse.slides);
                        setOptimizedStoryline(mockResponse.optimized_storyline);
                      }}
                    /> */}
                    {/* Canvas Slide Preview */}
                    <div className="mt-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Interactive Slide Canvas</h3>
                      <CanvasSlidePreview 
                      slides={slides} 
                      zoom={zoom} 
                      currentSlideIndex={currentSlideIndex} 
                      setCurrentSlideIndex={setCurrentSlideIndex} 
                      optimizedStoryline={optimizedStoryline}
                      onGenerateMockSlides={() => {
                        setUseMockData(true);
                        setSlides(mockResponse.slides);
                        setOptimizedStoryline(mockResponse.optimized_storyline);
                      }}
                      />
                    </div>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/buy-coins"
            element={<BuyCoins/>}
          />
          <Route
            path="/pricing"
            element={<PricingPage/>}  
          />
        </Routes>
      </div>
    </div>
  );
}

export default App;
