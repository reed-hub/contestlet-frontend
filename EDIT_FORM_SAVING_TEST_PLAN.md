# 🧪 **Edit Contest Form - Comprehensive Saving Test Plan**

## **Overview**
This document outlines a comprehensive testing plan for the contest edit form at `/admin/contests/{id}/edit` to identify which fields are not being saved properly when updated.

## **📍 Test Environment**
- **URL**: `http://localhost:3000/admin/contests/3/edit`
- **Branch**: `develop`
- **Backend**: `http://localhost:8000`
- **Status**: Development server running on port 3000

## **📋 Fields to Test for Proper Saving**

### **1. Basic Information (8 fields)**
- [ ] **Contest Name** (`name`)
- [ ] **Description** (`description`)
- [ ] **Location** (`location`)
- [ ] **Prize Description** (`prize_description`)
- [ ] **Start Date** (`start_date` → `start_time`)
- [ ] **End Date** (`end_date` → `end_time`)
- [ ] **Prize Value** (`prize_value` → `official_rules.prize_value_usd`)
- [ ] **Eligibility Text** (`eligibility_text` → `official_rules.eligibility_text`)

### **2. Image and Sponsor Fields (2 fields)**
- [ ] **Contest Hero Image/Video URL** (`image_url`)
- [ ] **Sponsor Website URL** (`sponsor_url`)

### **3. Advanced Options (10 fields)**
- [ ] **Contest Type** (`contest_type`)
- [ ] **Entry Method** (`entry_method`)
- [ ] **Winner Selection Method** (`winner_selection_method`)
- [ ] **Minimum Age** (`minimum_age`)
- [ ] **Max Entries Per Person** (`max_entries_per_person`)
- [ ] **Total Entry Limit** (`total_entry_limit`)
- [ ] **Consolation Offer** (`consolation_offer`)
- [ ] **Geographic Restrictions** (`geographic_restrictions`)
- [ ] **Contest Tags** (`contest_tags`)
- [ ] **Promotion Channels** (`promotion_channels`)

### **4. SMS Templates (3 fields)**
- [ ] **Entry Confirmation SMS** (`entry_confirmation_sms` → `sms_templates.entry_confirmation`)
- [ ] **Winner Notification SMS** (`winner_notification_sms` → `sms_templates.winner_notification`)
- [ ] **Non-Winner SMS** (`non_winner_sms` → `sms_templates.non_winner`)

### **5. Legal Compliance (4 fields)**
- [ ] **Sponsor Name** (`sponsor_name` → `official_rules.sponsor_name`)
- [ ] **Terms URL** (`terms_url` → `official_rules.terms_url`)
- [ ] **Official Start Date** (`official_start_date` → `official_rules.start_date`)
- [ ] **Official End Date** (`official_end_date` → `official_rules.end_date`)

## **🧪 Testing Methodology**

### **Step 1: Baseline Data Capture**
1. **Load the edit form** for contest ID 3
2. **Note all current values** for each field
3. **Take screenshots** of the current state
4. **Check browser console** for any errors

### **Step 2: Field-by-Field Testing**
1. **Modify one field at a time**
2. **Save the form** after each change
3. **Verify the change persists** after save
4. **Check browser console** for debug logs
5. **Document any failures**

### **Step 3: Comprehensive Testing**
1. **Modify multiple fields** simultaneously
2. **Save the form**
3. **Verify all changes persist**
4. **Check for any field interactions**

### **Step 4: Edge Case Testing**
1. **Test empty values** for optional fields
2. **Test special characters** in text fields
3. **Test very long values** for text fields
4. **Test invalid data** (should show validation errors)

## **🔍 Debug Information to Monitor**

### **Browser Console Logs**
- **Payload construction** logs
- **API request/response** logs
- **Form update** logs
- **Error messages**

### **Network Tab**
- **API request payloads**
- **API response data**
- **HTTP status codes**
- **Response headers**

### **Form State Changes**
- **Before save** vs **after save** values
- **Form data updates** after successful save
- **Any field value resets**

## **📊 Expected vs Actual Behavior**

### **Expected Behavior**
- ✅ **All field changes** should persist after save
- ✅ **Form should refresh** with updated values from backend
- ✅ **Success toast** should appear after save
- ✅ **No field values** should revert to previous values

### **Known Issues to Watch For**
- ❌ **Image URL not saving** (previously reported)
- ❌ **Sponsor URL not saving** (previously reported)
- ❌ **Advanced options** not persisting
- ❌ **SMS templates** not updating
- ❌ **Date fields** reverting to old values

## **🚨 Critical Fields to Test First**

### **High Priority (Previously Problematic)**
1. **Image URL** (`image_url`) - Critical for contest branding
2. **Sponsor URL** (`sponsor_url`) - Critical for sponsor links
3. **Prize Description** (`prize_description`) - Critical for user experience

### **Medium Priority (Core Functionality)**
1. **Contest Name** (`name`) - Core contest information
2. **Start/End Dates** (`start_date`, `end_date`) - Core timing
3. **Location** (`location`) - Core contest details

### **Low Priority (Advanced Features)**
1. **Advanced options** - Contest configuration
2. **SMS templates** - User communication
3. **Legal compliance** - Regulatory requirements

## **📝 Testing Results Template**

### **Field Test Result**
```
Field Name: [Field Name]
Field Type: [Input Type]
Test Action: [What was changed]
Before Value: [Original value]
After Value: [New value]
Save Result: [Success/Failure]
Persisted: [Yes/No]
Notes: [Any observations]
```

### **Overall Test Summary**
```
Test Date: [Date]
Test Duration: [Time taken]
Fields Tested: [Number of fields]
Fields Working: [Number working]
Fields Failing: [Number failing]
Critical Issues: [List of critical problems]
Recommendations: [Next steps]
```

## **🔧 Backend Integration Points**

### **API Endpoint**
- **URL**: `PUT /admin/contests/{id}`
- **Method**: PUT
- **Headers**: `Authorization: Bearer {token}`, `Content-Type: application/json`

### **Expected Response**
- **Status**: 200 OK
- **Body**: Updated contest object with all fields
- **Fields**: All modified fields should be returned with new values

### **Error Handling**
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (invalid token)
- **403**: Forbidden (insufficient privileges)
- **404**: Not Found (contest doesn't exist)
- **422**: Unprocessable Entity (data validation failed)
- **500**: Internal Server Error (server error)

## **📋 Next Steps**

### **Immediate (Today)**
1. **Execute comprehensive testing** using this plan
2. **Document all field failures** with detailed logs
3. **Identify critical vs minor issues**

### **Short Term (This Week)**
1. **Create backend bug report** for failing fields
2. **Prioritize fixes** based on criticality
3. **Test fixes** once implemented

### **Long Term (Ongoing)**
1. **Implement automated testing** for form persistence
2. **Add field validation** at the frontend level
3. **Improve error handling** and user feedback

---

## **🎯 Ready to Test?**

**This comprehensive testing plan will identify exactly which fields are not saving properly in the edit form.**

**Execute the tests systematically and document all results for the backend team to address.**

**The goal is to ensure 100% field persistence across all contest edit operations.** 🚀
