import { Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { useState, useEffect, createContext, useContext } from "react";
import SlideForm from "./components/SlideForm";
import SlidePreview from "./components/SlidePreview";
import { generateSlides } from "./api";
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
    "Market Analysis and Competitive Landscape",
    "Financial Overview and Projections",
    "Strategic Recommendations for Revitalization"
  ],
  "context_analysis": {
    "market_trends": "The coffee subscription market is experiencing rapid growth, driven by consumer demand for convenience and quality. The rise of D2C brands has intensified competition, emphasizing the need for unique customer experiences.",
    "customer_insights": "Existing customers are seeking more personalized and engaging experiences. Churn rates are increasing, indicating dissatisfaction with the current offering.",
    "competitive_analysis": "Competitors are leveraging technology for personalization and community-building, which The Daily Grind currently lacks."
  },
  "slides": [
    {
      "slide_number": 1,
      "title": "Market Analysis and Competitive Landscape",
      "visualization": "Bar Chart",
      "frameworks": [
        "SWOT Analysis",
        "Porter's Five Forces"
      ],
      "content": [
        "The coffee subscription market is projected to grow at a CAGR of 12% over the next five years.",
        "Emerging D2C brands are capturing market share by offering personalized experiences and community engagement.",
        "SWOT Analysis reveals strengths in product quality but weaknesses in digital engagement.",
        "Porter's Five Forces indicate high competitive rivalry and bargaining power of customers.",
        "Key opportunities include leveraging technology for personalization and enhancing customer engagement."
      ],
      "takeaway": "The competitive landscape is shifting, and immediate action is needed to address market threats and capitalize on opportunities.",
      "call_to_action": "Conduct a comprehensive market research study to identify customer preferences and trends.",
      "executive_summary": "The coffee subscription market is evolving rapidly, with increased competition from D2C brands. A detailed analysis of market dynamics reveals critical areas for improvement.",
      "detailed_analysis": "The analysis indicates that The Daily Grind must enhance its digital presence and customer engagement strategies to remain competitive.",
      "methodology": "Utilized market research reports, customer surveys, and competitive analysis frameworks to assess the current market landscape.",
      "data": [
        {
          "label": "Region A",
          "value": 120
        },
        {
          "label": "Region B",
          "value": 95
        },
        {
          "label": "Region C",
          "value": 140
        },
        {
          "label": "Region D",
          "value": 110
        }
      ],
      "framework_data": {
        "SWOT Analysis": {
          "Strengths": [
            "High product quality",
            null
          ],
          "Weaknesses": [
            "Limited digital engagement",
            null
          ],
          "Opportunities": [
            "Leveraging technology for personalization",
            "Enhancing customer engagement"
          ],
          "Threats": [
            "High competitive rivalry",
            "Bargaining power of customers"
          ]
        }
      },
      "chart_data": {
        "xAxisTitle": "Fiscal Year",
        "yAxisTitle": "Financial Metrics ($M)",
        "legend": "Financial Overview",
        "inferences": [
          "Revenue is projected to decrease from $4.2M to $4.0M in the next fiscal year.",
          "Customer Lifetime Value (CLV) is expected to decline from $450 to $400.",
          "Cost of Goods Sold (COGS) is projected to decrease slightly from $1.8M to $1.75M.",
          "Marketing & G&A expenses are expected to remain stable at $0.8M."
        ]
      }
    }
  ],
  "recommendations": [
    "Invest in technology to enhance data-driven personalization.",
    "Create engaging content and community initiatives to foster customer loyalty.",
    "Reevaluate marketing strategies to optimize customer acquisition costs.",
    "Implement a customer feedback loop to continuously improve offerings."
  ],
  "problem_statement": "The Daily Grind\" is a beloved, ten-year-old coffee subscription service. For years, its business model was simple and successful: a monthly delivery of high-quality, whole-bean coffee from a curated selection of roasters. The company built a loyal customer base of coffee enthusiasts who valued quality and convenience.\nHowever, the market has become fiercely competitive. The rise of a new wave of direct-to-consumer (D2C) coffee brands has fragmented the market. These new players are not just selling beans; they are building vibrant online communities, leveraging influencer partnerships, and offering a highly personalized subscription experience (e.g., custom flavor profiles, AI-driven recommendations, single-origin drops). As a result, The Daily Grind has seen its new customer acquisition slow to a trickle, while a significant portion of its existing customer base is showing signs of churn.\n2. The Core Problem\nThe Daily Grind is at a critical crossroads. Its brand, once a market leader, is now perceived as a \"basic\" and somewhat impersonal service in a market that craves unique experiences and a sense of community. Its digital presence is functional but not engaging, and it lacks the data-driven personalization that its competitors are using to build lasting relationships with customers.\nYour task is to develop a comprehensive strategy to revitalize The Daily Grind and secure its future in a crowded and dynamic market.\n\nThis table provides a basic financial overview.\nMetric\tLast Fiscal Year\tProjections (Next Year)\nRevenue\t$4.2M\t$4.0M\nCustomer Lifetime Value (CLV)\t$450\t$400 (Projected)\nCost of Goods Sold (COGS)\t$1.8M\t$1.75M\nMarketing & G&A\t$0.8M\t$0.8M"
};


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
  const navigate = useNavigate();
  const { isAuthenticated, setIsAuthenticated, token, setToken } = useContext(AuthContext);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCoinDropdown, setShowCoinDropdown] = useState(false);
  // Fetch user name if authenticated
  useEffect(() => {
    
    const fetchUserName = async () => {
      
        try {
          const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/user`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUserName("Hi " + data.name);
            setUserCoins(data.coins ?? 0);
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
        const consumeRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/auth/consume_coin`, {
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
                    <SlidePreview slides={slides} isLoading={isLoading} zoom={zoom} optimizedStoryline={optimizedStoryline} />
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
