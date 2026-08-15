from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    dataset_id: int | None = None

class ChatResponse(BaseModel):
    reply: str

@router.post("/", response_model=ChatResponse)
async def chat_with_assistant(req: ChatRequest):
    user_msg = req.message.lower().strip()
    
    # Pre-defined intelligent-sounding responses for the Mock AI
    if any(word in user_msg for word in ["hello", "hi", "hey"]):
        reply = "Hello! I am your AI Data Enrichment Assistant. I can help you understand your uploaded datasets, explain the enrichment pipeline, or clarify evaluation metrics. What would you like to know?"
    
    elif any(word in user_msg for word in ["what is", "how does", "pipeline", "enrich"]):
        reply = "Our AI pipeline takes your raw product descriptions and extracts structured attributes. It uses our master reference data (like LOVs and Manufacturer lists) to normalize the fields, ensuring standard naming conventions and high data quality."
        
    elif any(word in user_msg for word in ["stats", "statistics", "how many", "count"]):
        reply = "To see exact statistics, please refer to the KPI dashboard at the top of the page. It automatically calculates the number of enriched products, high-confidence matches, and products requiring human review based on the currently selected dataset."
        
    elif any(word in user_msg for word in ["evaluate", "benchmark", "accuracy", "ground truth"]):
        reply = "The Ground Truth Evaluation panel compares our AI's output against a verified 200-item master workbook. It measures exact field matches, manufacturer/brand canonicalization, and LOV compliance to give you an accurate picture of our model's performance."
        
    elif any(word in user_msg for word in ["error", "bug", "issue", "help"]):
        reply = "If you're encountering an issue, make sure you have selected a dataset from the top dropdown. If data is missing, try running the 'Run Pipeline' button to process any raw imported rows."
        
    elif any(word in user_msg for word in ["dataset", "file", "upload", "csv", "excel"]):
        reply = "You can upload new datasets using the 'Upload' button in the top right. We support both CSV and Excel (.xlsx) formats. Once uploaded, the file is converted into a dataset that you can select from the dropdown."
        
    else:
        reply = "That's a great question! As a specialized Data Enrichment AI, I am highly focused on product data, master data normalization, and accuracy benchmarks. Could you rephrase your question to relate to your datasets or the enrichment process?"

    return ChatResponse(reply=reply)
