// src/controllers/aiController.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const analyzeTrades = async (req, res) => {
  const { trades } = req.body;

  if (!trades || !Array.isArray(trades) || trades.length === 0) {
    return res.status(400).json({ error: 'Trade data is required.' });
  }

  // Enhanced prompt for better JSON output
  const prompt = `
    You are a data analyst for a trading journal. Analyze the provided trade data and return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

    Return exactly this JSON structure (replace placeholder values with actual analysis):
    {
      "performanceSummary": "A one-paragraph summary of the overall trading performance based on the data provided.",
      "confidenceLevel": 7,
      "keyMetrics": [
        { "metric": "Total Net P&L", "value": "₹X,XXX.XX", "sentiment": "positive" },
        { "metric": "Win Rate", "value": "XX.X%", "sentiment": "positive" },
        { "metric": "Profit Factor", "value": "X.XX", "sentiment": "positive" },
        { "metric": "Average Winning Trade", "value": "₹X,XXX.XX", "sentiment": "neutral" },
        { "metric": "Average Losing Trade", "value": "₹X,XXX.XX", "sentiment": "neutral" }
      ],
      "strengths": [
        "First key strength based on the data",
        "Second key strength based on the data"
      ],
      "weaknesses": [
        "First area for improvement based on the data", 
        "Second area for improvement based on the data"
      ],
      "actionableAdvice": [
        "First piece of actionable advice based on the analysis",
        "Second piece of actionable advice based on the analysis"
      ]
    }

    Calculate all metrics from this trade data:
    ${JSON.stringify(trades, null, 2)}

    Remember: Return ONLY the JSON object, no other text.
  `;

  try {
    // Debug logging
    console.log('=== DEBUG INFO ===');
    console.log('API Key exists:', !!process.env.GOOGLE_API_KEY);
    console.log('API Key length:', process.env.GOOGLE_API_KEY?.length);
    console.log('API Key prefix:', process.env.GOOGLE_API_KEY?.substring(0, 15));
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('==================');

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    console.log('Model created successfully');
    console.log('Calling generateContent...');
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    let jsonString = response.text();
    console.log('Raw AI response:', jsonString);

    // Enhanced JSON extraction
    const startIndex = jsonString.indexOf('{');
    const endIndex = jsonString.lastIndexOf('}');

    if (startIndex !== -1 && endIndex !== -1) {
      jsonString = jsonString.substring(startIndex, endIndex + 1);
    } else {
      throw new Error('No valid JSON found in response');
    }
    
    // Parse and validate JSON
    const analysisData = JSON.parse(jsonString);
    
    // Basic validation of required fields
    if (!analysisData.performanceSummary || !analysisData.keyMetrics) {
      throw new Error('Invalid analysis data structure');
    }
    
    console.log('Successfully parsed analysis data');
    res.status(200).json({ analysis: analysisData });

  } catch (error) {
    // ENHANCED ERROR LOGGING - This will show us the exact error
    console.error('=== FULL ERROR DETAILS ===');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('Error status:', error.status);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('========================');
    
    // Enhanced error handling with more specific checks
    if (error.message?.includes('RESOURCE_EXHAUSTED')) {
      res.status(429).json({ 
        error: 'Rate limit exceeded. Free tier allows 15 requests per minute. Please wait 4+ seconds between requests.' 
      });
    } else if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('PERMISSION_DENIED')) {
      res.status(401).json({ 
        error: 'Invalid API key or permissions. Please check your Google AI Studio API key.' 
      });
    } else if (error.message?.includes('UNAUTHENTICATED')) {
      res.status(401).json({
        error: 'Authentication failed. Please verify your API key is correct and properly set.'
      });
    } else if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      res.status(500).json({ 
        error: 'AI returned invalid data format. Please try again.' 
      });
    } else if (error.message?.includes('FAILED_PRECONDITION')) {
      res.status(400).json({
        error: 'Gemini API not available in your region or billing not enabled.'
      });
    } else if (error.message?.includes('fetch')) {
      res.status(500).json({
        error: 'Network error connecting to Google AI service. Check your internet connection.'
      });
    } else {
      // Return the ACTUAL error message for debugging
      res.status(500).json({ 
        error: 'Communication error with AI service',
        details: error.message, // Always show the actual error message
        debugInfo: {
          hasApiKey: !!process.env.GOOGLE_API_KEY,
          keyLength: process.env.GOOGLE_API_KEY?.length,
          keyPrefix: process.env.GOOGLE_API_KEY?.substring(0, 15),
          errorName: error.name,
          errorCode: error.code
        }
      });
    }
  }
};

const testAIConnection = async (req, res) => {
  try {
    console.log('=== TESTING AI CONNECTION ===');
    console.log('API Key exists:', !!process.env.GOOGLE_API_KEY);
    console.log('API Key length:', process.env.GOOGLE_API_KEY?.length);
    console.log('API Key starts with AIza:', process.env.GOOGLE_API_KEY?.startsWith('AIza'));
    console.log('==============================');
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash"
    });
    
    const testPrompt = 'Respond with exactly this JSON: {"status": "success", "message": "API connection working"}';
    
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('Test response:', text);
    
    res.json({ 
      success: true, 
      message: 'Google AI Studio API connection successful!',
      response: text,
      model: 'gemini-1.5-flash',
      tier: 'Free'
    });
    
  } catch (error) {
    console.error('=== TEST CONNECTION ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('============================');
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      hasApiKey: !!process.env.GOOGLE_API_KEY,
      keyPrefix: process.env.GOOGLE_API_KEY?.substring(0, 15),
      keyLength: process.env.GOOGLE_API_KEY?.length,
      errorDetails: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });
  }
};

module.exports = {
  analyzeTrades,
  testAIConnection,
};
