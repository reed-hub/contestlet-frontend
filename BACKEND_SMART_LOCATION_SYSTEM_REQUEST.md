# Backend Feature Request: Smart Location System

## 🎯 **Overview**
Implement a comprehensive geographic targeting system for contests that allows admins to specify precise location restrictions beyond simple text descriptions.

## 🔧 **Current State**
- Basic `location` field as simple text string
- Limited geographic targeting capabilities
- No validation or structured location data

## 🚀 **Requested Features**

### **1. Enhanced Location Model**
Replace the simple `location` string field with a structured location system:

```python
class ContestLocation(BaseModel):
    location_type: Literal["united_states", "specific_states", "radius", "custom"]
    
    # For specific states selection
    selected_states: List[str] = []  # List of state codes: ["CA", "NY", "TX"]
    
    # For radius-based targeting
    radius_address: Optional[str] = None
    radius_miles: Optional[int] = None
    radius_coordinates: Optional[GeoCoordinates] = None
    
    # For custom text (fallback)
    custom_text: Optional[str] = None
    
    # Computed/display field
    display_text: str  # Human-readable location description

class GeoCoordinates(BaseModel):
    latitude: float
    longitude: float
```

### **2. Database Schema Updates**
```sql
-- Add new location fields to contests table
ALTER TABLE contests ADD COLUMN location_type VARCHAR(20) DEFAULT 'united_states';
ALTER TABLE contests ADD COLUMN selected_states JSONB; -- Array of state codes
ALTER TABLE contests ADD COLUMN radius_address VARCHAR(500);
ALTER TABLE contests ADD COLUMN radius_miles INTEGER;
ALTER TABLE contests ADD COLUMN radius_latitude DECIMAL(10, 8);
ALTER TABLE contests ADD COLUMN radius_longitude DECIMAL(11, 8);

-- Keep existing location field for backward compatibility
-- ALTER TABLE contests RENAME COLUMN location TO location_display;
```

### **3. API Endpoints**

#### **Location Validation**
```python
@router.post("/admin/contests/validate-location")
async def validate_contest_location(location_data: ContestLocation):
    """Validate and geocode location data"""
    # Validate state codes
    # Geocode addresses
    # Return validation results
```

#### **Geocoding Service**
```python
@router.post("/admin/contests/geocode-address")
async def geocode_address(address: str):
    """Geocode an address to coordinates"""
    # Use OpenStreetMap Nominatim or Google Geocoding API
    # Return coordinates and formatted address
```

### **4. Location Processing Logic**

#### **State Code Validation**
```python
VALID_STATE_CODES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
]

def validate_state_codes(states: List[str]) -> List[str]:
    """Validate and return only valid state codes"""
    return [state.upper() for state in states if state.upper() in VALID_STATE_CODES]
```

#### **Radius Calculation**
```python
from geopy.distance import geodesic

def is_location_in_radius(
    target_lat: float, 
    target_lng: float, 
    center_lat: float, 
    center_lng: float, 
    radius_miles: int
) -> bool:
    """Check if target location is within specified radius"""
    center = (center_lat, center_lng)
    target = (target_lat, target_lng)
    distance = geodesic(center, target).miles
    return distance <= radius_miles
```

### **5. Contest Entry Validation**
```python
async def validate_contest_eligibility(
    contest: Contest, 
    user_location: Optional[UserLocation]
) -> Tuple[bool, str]:
    """Check if user is eligible based on contest location restrictions"""
    
    if contest.location_type == "united_states":
        return True, "Open to all US residents"
    
    elif contest.location_type == "specific_states":
        if not user_location or not user_location.state:
            return False, "Location verification required"
        
        if user_location.state in contest.selected_states:
            return True, f"Open to {user_location.state} residents"
        else:
            return False, f"Contest restricted to: {', '.join(contest.selected_states)}"
    
    elif contest.location_type == "radius":
        if not user_location or not user_location.coordinates:
            return False, "Location verification required"
        
        if is_location_in_radius(
            user_location.coordinates.lat,
            user_location.coordinates.lng,
            contest.radius_latitude,
            contest.radius_longitude,
            contest.radius_miles
        ):
            return True, f"Within {contest.radius_miles} miles of contest location"
        else:
            return False, f"Outside contest radius ({contest.radius_miles} miles)"
    
    else:  # custom
        return True, contest.location_display
```

## 📋 **Implementation Priority**

### **Phase 1: Core Location Model**
- [ ] Update Contest model with new location fields
- [ ] Database migration script
- [ ] Basic location type validation

### **Phase 2: State and Radius Support**
- [ ] State code validation
- [ ] Radius calculation utilities
- [ ] Geocoding service integration

### **Phase 3: Entry Validation**
- [ ] Location-based eligibility checking
- [ ] User location verification
- [ ] Contest entry filtering

### **Phase 4: Advanced Features**
- [ ] Location analytics and reporting
- [ ] Multi-location contest support
- [ ] Location-based marketing tools

## 🔍 **Technical Considerations**

### **Geocoding Services**
- **OpenStreetMap Nominatim**: Free, good coverage, rate limits
- **Google Geocoding API**: Premium, excellent accuracy, higher costs
- **Fallback strategy**: Start with Nominatim, upgrade to Google if needed

### **Performance**
- Cache geocoded coordinates
- Index location fields for fast queries
- Consider spatial database extensions (PostGIS) for complex queries

### **Data Migration**
- Preserve existing location data in `location_display` field
- Provide migration tools for admins to convert old locations
- Maintain backward compatibility during transition

## 📊 **Benefits**

1. **Precise Targeting**: Exact geographic boundaries instead of vague descriptions
2. **Better Compliance**: Clear eligibility rules for legal requirements
3. **Improved UX**: Users know exactly if they're eligible
4. **Marketing Insights**: Location-based analytics and reporting
5. **Scalability**: Support for complex multi-location campaigns

## 🧪 **Testing Scenarios**

1. **State Selection**: Contest restricted to CA, NY, TX
2. **Radius Targeting**: Contest within 25 miles of specific address
3. **Mixed Locations**: Multiple contests with different location types
4. **Edge Cases**: Invalid coordinates, missing location data
5. **Performance**: Large numbers of location-based queries

## 📝 **API Examples**

### **Create Contest with State Restriction**
```json
{
  "name": "California Summer Contest",
  "location_type": "specific_states",
  "selected_states": ["CA"],
  "display_text": "Open to California residents only"
}
```

### **Create Contest with Radius**
```json
{
  "name": "Downtown Chicago Contest",
  "location_type": "radius",
  "radius_address": "123 Michigan Ave, Chicago, IL",
  "radius_miles": 10,
  "radius_coordinates": {
    "latitude": 41.8781,
    "longitude": -87.6298
  },
  "display_text": "Within 10 miles of downtown Chicago"
}
```

---

**Priority**: High  
**Effort**: Medium (2-3 weeks)  
**Impact**: High (significantly improves contest targeting capabilities)
