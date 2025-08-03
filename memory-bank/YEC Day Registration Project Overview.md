ฉันได้รวบรวมข้อมูลจากเอกสารทั้งหมดของคุณและเตรียม **Project Overview** ที่ครอบคลุมและละเอียดพอให้คุณใช้เป็นคู่มือหลักในการพัฒนาเว็บไซต์ YEC Day Registration ด้วย Next.js + Docker + CI/CD + Cursor AI ตั้งแต่ต้นจนจบ

ด้านล่างคือเอกสารร่าง **Project Overview** ที่รวมทั้ง **Project Roadmap** และ **Task Breakdown (Phase-based)** พร้อมกับเทคโนโลยีหลักและ Workflow ที่เราจะใช้ตลอดโปรเจกต์นี้

---

# **YEC Day Registration Website – Project Overview**

## 1. **Project Summary**

**Project Name:** YEC Day Registration Website  
**Objective:** พัฒนา Landing Page พร้อมระบบลงทะเบียนออนไลน์ที่ผู้ใช้สามารถกรอกข้อมูล อัปโหลดรูปหลักฐานการชำระเงิน และส่งข้อมูลไปยัง Google Sheets ผ่าน Apps Script และ Webhook โดยทั้งหมดจะต้อง Responsive และมีระบบตรวจสอบข้อมูล (Validation) ครบถ้วน  
**Framework:** Next.js (React, TypeScript, TailwindCSS)  
**Deployment:** Vercel (Production)  
**Development Environment:** Docker (Dev Mode & Prod Mode), GitHub + GitHub Actions (CI/CD), Cursor AI

---

## 2. **Technology Stack**

- **Frontend:** Next.js 14 (React, TypeScript) + TailwindCSS
    
- **Backend:** Next.js API Routes (serverless functions)
    
- **Storage:** Google Sheets (Apps Script Webhook), Google Drive (สำหรับรูปภาพ)
    
- **AI & Tools:** Cursor IDE + CursorRIPER AI Rules
    
- **DevOps:** Docker (Multi-stage build), GitHub Actions (CI), Vercel (CD)
    
- **Workflow Tools:** n8n (เชื่อมต่อ Line OA, Notifications)
    

---

## 3. **Core Features**

- **Landing Page:**
    
    - แบบฟอร์มกรอกข้อมูล (รวมทั้งการอัปโหลดรูปภาพ 3 ประเภท)
        
    - การตรวจสอบข้อมูลแบบ Real-Time (Validation UX/UI)
        
    - Responsive (Mobile/PC)
        
- **Preview Page:**
    
    - แสดงข้อมูลที่ผู้สมัครกรอกไว้
        
    - Checkbox สำหรับยืนยัน PDPA
        
    - ปุ่ม Submit และ Edit
        
- **Integration:**
    
    - ส่งข้อมูลทั้งหมดไปยัง Google Sheets + อัปโหลดไฟล์ภาพไป Google Drive
        
    - n8n → Line OA → Line Group notification
        

---

## 4. **Compliance & Standards**

- **Accessibility:** WCAG 2.1 AA (ตาม UX/UI Validation)
    
- **Code Style:** ESLint, TypeScript strict mode
    
- **Security:** Input Sanitization, File Upload Validation, ENV Protection
    
- **CI/CD:** PR Build Preview, Auto Deploy (Vercel)
    

---

## 5. **Project Roadmap**

### **Phase 0: Initial Setup**

**Main Tasks:**

1. **Setup Local Next.js Project**
    
    - `npx create-next-app@latest yec-registration --typescript --tailwind --eslint`
        
2. **Initialize GitHub Repo**
    
    - `.gitignore` (ตามมาตรฐาน Node.js + Docker)
        
    - `git init && git remote add origin ...`
        
3. **CursorRIPER Framework Integration** (ตาม [14])
    

---

### **Phase 1: DEV Environment Setup**

**Main Tasks:**

1. **Docker Setup**
    
    - `Dockerfile.dev` + `docker-compose.dev.yml` (Hot Reload, Volume Mount)
        
    - สร้างไฟล์ `Dockerfile` (Production-ready multi-stage)
        
2. **Next.js Config**
    
    - `next.config.ts` (รองรับ dev/prod mode)
        
3. **CI/CD Preparation**
    
    - GitHub Actions: `ci.yml` สำหรับ test & build
        
    - Preview Deploy (Vercel)
        
4. **Cursor AI + Rules**
    
    - ติดตั้ง `.cursor/` และ `rules` พร้อมใช้งาน
        

---

### **Phase 2: Landing Page Development**

**Main Tasks:**

1. Global Components (TopMenuBar, Footer, Form Wrapper)
    
2. Form Fields (Dynamic + Validation ตาม [11] และ [10])
    
3. Image Upload (3 fields: Profile, Membership Card, Payment Slip)
    

---

### **Phase 3: Preview & PDPA Page**

**Main Tasks:**

1. Preview page layout
    
2. PDPA Checkbox (ข้อความ PDPA ที่เราต้องเขียนให้เหมาะสม)
    
3. Navigation: Edit → Back → Submit
    

---

### **Phase 4: API & Integration**

**Main Tasks:**

1. API Route `/api/submit` → ส่งข้อมูลไป Google Sheets (Apps Script)
    
2. Upload Image → Google Drive
    
3. n8n Integration → LINE OA Notify
    

---

### **Phase 5: Production Setup**

**Main Tasks:**

1. Build Docker Image (Prod Mode)
    
2. CI/CD with GitHub Actions
    
3. Vercel Deploy + Testing
    
4. Performance Tuning (Lighthouse, SEO, Image Optimization)
    

---

### **Phase 6: Post-Launch & Admin Tools**

**Main Tasks:**

1. Admin Dashboard (view bookings)
    
2. Error Log & Monitoring
    
3. Bug Fix & Iteration
    

---

## 6. **Issue Tracking & Feature Registry**

- **Feature Registry:** Landing Page, Preview Page, Form Validation, Google Sheets Sync, LINE Notify
    
- **Tracking Tool:** GitHub Issues + progress.md (CursorRIPER)
    

---

## 7. **Key References**

- [11] YEC Day Registration website.pdf – UX, Form Fields, Workflow
    
- [10] Project Architecture Guide – Validation, Form System
    
- [13][14][15] DevOps & Docker Guide – Environment Setup & Workflow
    
- [12] Copilot Project Development Template – Co-pilot rules & Communication
    

---
