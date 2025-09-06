import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_AI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

// Create a chat session specifically for cost estimation
export const costEstimationSession = model.startChat({
  generationConfig,
  history: [
    {
      role: "user",
      parts: [
        {text: "Generate cost estimates for a trip to Cox's Bazar, Bangladesh for 3 days with a medium budget level. Include accommodation, food, transportation, and activities costs."},
      ],
    },
    {
      role: "model",
      parts: [
        {text: "```json\n{\n  \"accommodation\": 3000,\n  \"food\": 1200,\n  \"transportation\": 4500,\n  \"activities\": 800\n}\n```\n\nThese estimates are based on a medium budget level for Cox's Bazar:\n\n- **Accommodation**: 3000 BDT per night for a mid-range hotel or resort\n- **Food**: 1200 BDT per day for a mix of local restaurants and some nicer dining options\n- **Transportation**: 4500 BDT total for round-trip travel from Dhaka and local transportation\n- **Activities**: 800 BDT per day for standard paid attractions and some guided tours\n\nPlease note that these are estimates and actual costs may vary based on specific choices, season, and availability."},
      ],
    },
  ],
});

// Function to generate trip cost estimates
export const generateTripCostEstimates = async (destination, noOfDays, budgetType) => {
  try {
    // Extract destination name before any comma
    let cleanDestination = destination;
    if (destination.includes(',')) {
      cleanDestination = destination.split(',')[0].trim();
    }
    
    console.log("Using destination for API call:", cleanDestination);
    
    // Create prompt for cost estimation
    const prompt = `
      I need detailed cost estimates for a trip to ${cleanDestination}, Bangladesh with a ${budgetType} budget level for ${noOfDays} days.
      
      Please consider the following:
      
      1. ACCOMMODATION: For ${budgetType} budget in ${cleanDestination}, what would be the cost per night?
         - For low budget: Consider hostels, budget guesthouses, or cheap hotels
         - For medium budget: Consider mid-range hotels or resorts
         - For high/luxury budget: Consider luxury hotels or premium resorts
      
      2. FOOD: Daily food costs for ${budgetType} budget in ${cleanDestination}
         - For low budget: Street food, local eateries
         - For medium budget: Mix of local restaurants and some nicer options
         - For high/luxury budget: Fine dining, upscale restaurants
      
      3. TRANSPORTATION:
         - Calculate round-trip cost from Dhaka to ${cleanDestination} for ${budgetType} budget level
         - Include estimated local transportation within ${cleanDestination} for the entire stay
      
      4. ACTIVITIES: Daily costs for attractions and activities in ${cleanDestination} for ${budgetType} budget
         - For low budget: Free/cheap attractions, self-guided tours
         - For medium budget: Standard paid attractions, some guided tours
         - For high/luxury budget: Premium experiences, private guides, exclusive activities
      
      Format your response as a JSON object with these exact keys: accommodation, food, transportation, activities.
      Each value should be a NUMBER in BDT without any text or currency symbols.
      The accommodation and food values should be PER DAY costs.
      The transportation value should be the TOTAL for the trip including Dhaka travel.
      The activities value should be PER DAY cost.
      
      Example: {"accommodation": 2000, "food": 800, "transportation": 5000, "activities": 500}
      
      IMPORTANT: Your response must be a valid JSON object and nothing else. Do not include any explanations or text outside the JSON object.
    `;
    
    // Send message to the chat session
    const result = await costEstimationSession.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("Raw Gemini response:", text);
    
    // Extract JSON from response - looking for content between ```json and ```
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const jsonMatch = text.match(jsonRegex);
    
    if (jsonMatch && jsonMatch[1]) {
      try {
        const costData = JSON.parse(jsonMatch[1].trim());
        
        // Validate that all required properties exist
        if (costData.accommodation === undefined || 
            costData.food === undefined || 
            costData.transportation === undefined || 
            costData.activities === undefined) {
          throw new Error("Missing required cost properties in Gemini response");
        }
        
        // Convert values to numbers to ensure they're numeric
        const numericCostData = {
          accommodation: Number(costData.accommodation),
          food: Number(costData.food),
          transportation: Number(costData.transportation),
          activities: Number(costData.activities)
        };
        
        return {
          success: true,
          data: numericCostData,
          rawResponse: text
        };
      } catch (parseError) {
        console.error("Error parsing JSON from Gemini:", parseError);
        return {
          success: false,
          error: `Error parsing Gemini response: ${parseError.message}`,
          rawResponse: text
        };
      }
    } else {
      // If we can't find JSON in the expected format, try a more general approach
      const generalJsonMatch = text.match(/\{[\s\S]*\}/);
      if (generalJsonMatch) {
        try {
          const costData = JSON.parse(generalJsonMatch[0]);
          
          // Validate and convert as before
          if (costData.accommodation === undefined || 
              costData.food === undefined || 
              costData.transportation === undefined || 
              costData.activities === undefined) {
            throw new Error("Missing required cost properties in Gemini response");
          }
          
          const numericCostData = {
            accommodation: Number(costData.accommodation),
            food: Number(costData.food),
            transportation: Number(costData.transportation),
            activities: Number(costData.activities)
          };
          
          return {
            success: true,
            data: numericCostData,
            rawResponse: text
          };
        } catch (parseError) {
          console.error("Error parsing JSON from Gemini (general approach):", parseError);
          return {
            success: false,
            error: `Error parsing Gemini response: ${parseError.message}`,
            rawResponse: text
          };
        }
      }
      
      console.error("No JSON found in Gemini response");
      return {
        success: false,
        error: "Gemini did not return a valid JSON response. Please try again.",
        rawResponse: text
      };
    }
  } catch (error) {
    console.error("Error generating AI cost estimates:", error);
    return {
      success: false,
      error: `Error generating cost estimates: ${error.message}`
    };
  }
};