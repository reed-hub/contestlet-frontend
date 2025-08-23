# 🖼️ Backend Feature Request: Image Storage & Sponsor URL Fields

## **Missing Fields Required**

### **1. Contest Image Storage**
- **Field**: `image_url` in Contest model
- **Purpose**: Hero image for contest entry pages (1:1 aspect ratio)
- **Storage**: CDN/cloud storage solution
- **Format**: URL to hosted image

### **2. Sponsor Website URL**
- **Field**: `sponsor_url` in Contest model  
- **Purpose**: Link to sponsor's website (e.g., "https://traveladventureshow.com")
- **Type**: String field (URL)

## **Current Issue**
- Contest entry pages showing sample data because `image_url` is missing
- Cannot display proper contest branding and visual identity
- Frontend enhanced UI ready but needs backend data

## **Implementation Required**
```python
# Add to Contest model
class Contest(Base):
    # ... existing fields ...
    image_url: Optional[str] = None  # CDN URL to contest image
    sponsor_url: Optional[str] = None  # Sponsor website URL
    # Note: sponsor_name already exists and will be used
```

## **Priority**: **High** - Blocks enhanced contest entry page functionality

## **Testing**
1. Create contest with `image_url` and `sponsor_url`
2. Verify fields appear in admin panel
3. Test contest entry page displays correct data

---

**Status**: Frontend ready, backend implementation needed
**Impact**: Enhanced contest entry pages cannot function properly
**Note**: `sponsor_name` field already exists and will be used
