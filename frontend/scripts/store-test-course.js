/**
 * Script to store a test course and add a Canvas API key in the Supabase database
 * 
 * Usage:
 *   cd frontend
 *   node scripts/store-test-course.js
 * 
 * Or with a specific user ID:
 *   USER_ID=your-user-uuid node scripts/store-test-course.js
 * 
 * Or with a Canvas API key:
 *   CANVAS_API_KEY=your-canvas-api-key node scripts/store-test-course.js
 */

const dotenv = require("dotenv");
const path = require("path");
const CryptoJS = require("crypto-js");

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const encryptionKey = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'incourse-default-encryption-key-2024';

// User ID to use (can be overridden by environment variable)
const uid = process.env.USER_ID || "905f5ad7-4649-4901-8970-71f54ae0ddcd";

// Canvas API key to store (optional)
const canvasApiKey = process.env.CANVAS_API_KEY || "test_canvas_api_key_12345";
const canvasBaseUrl = process.env.CANVAS_BASE_URL || "https://canvas.instructure.com";

// Import createClient dynamically (ES module)
let supabase;
async function initSupabase() {
  const { createClient } = await import("../src/lib/utils/supabase/server.ts");
  supabase = await createClient();
}

// Encrypt API key function
function encryptApiKey(text) {
  try {
    const encrypted = CryptoJS.AES.encrypt(text, encryptionKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting API key:', error);
    throw new Error('Failed to encrypt API key');
  }
}

async function addCanvasApiKey() {
  console.log("\n🔑 Adding Canvas API Key...");
  console.log(`📝 User ID: ${uid}`);
  console.log(`🌐 Canvas Base URL: ${canvasBaseUrl}`);
  
  try {
    // First, check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", uid)
      .single();

    if (userError || !user) {
      console.error("❌ User not found. Please create a user first.", userError);
      console.log("💡 User ID:", uid);
      return;
    }

    console.log(`✅ Found user: ${user.full_name} (${user.email})`);

    // Encrypt the API key
    const encryptedKey = encryptApiKey(canvasApiKey);
    console.log("✅ API key encrypted successfully");

    // Check if an API key already exists for this user and provider
    const { data: existingKey } = await supabase
      .from("user_api_keys")
      .select("id")
      .eq("user_id", uid)
      .eq("lms_provider", "canvas")
      .single();

    if (existingKey) {
      // Update existing key
      const { data, error } = await supabase
        .from("user_api_keys")
        .update({
          encrypted_api_key: encryptedKey,
          api_base_url: canvasBaseUrl,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingKey.id)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating API key:", error.message);
        return;
      }

      console.log("✅ Canvas API key updated successfully!");
      console.log("📋 API Key ID:", data.id);
    } else {
      // Insert new key
      const { data, error } = await supabase
        .from("user_api_keys")
        .insert({
          user_id: uid,
          lms_provider: "canvas",
          encrypted_api_key: encryptedKey,
          api_base_url: canvasBaseUrl,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error inserting API key:", error.message);
        return;
      }

      console.log("✅ Canvas API key added successfully!");
      console.log("📋 API Key ID:", data.id);
    }

    // Verify the key was stored
    const { data: storedKey, error: verifyError } = await supabase
      .from("user_api_keys")
      .select("id, lms_provider, api_base_url, is_active, created_at")
      .eq("user_id", uid)
      .eq("lms_provider", "canvas")
      .single();

    if (verifyError) {
      console.error("❌ Error verifying API key:", verifyError.message);
      return;
    }

    console.log("\n📊 Stored API Key Details:");
    console.log("  - ID:", storedKey.id);
    console.log("  - Provider:", storedKey.lms_provider);
    console.log("  - Base URL:", storedKey.api_base_url);
    console.log("  - Active:", storedKey.is_active);
    console.log("  - Created:", storedKey.created_at);

  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

async function storeTestCourse() {
  console.log("\n📚 Storing test course...");
  
  try {
    // Create a test course
    const testCourse = {
      lms_id: "12345",
      lms_provider: "canvas",
      name: "Introduction to Computer Science",
      code: "CS101",
      instructor: "Dr. Jane Smith",
      description: "A comprehensive introduction to computer science fundamentals",
      semester: "Fall",
      year: "2025",
    };

    const { data: course, error: courseError } = await supabase
      .from("courses")
      .upsert(testCourse, {
        onConflict: "lms_id,lms_provider",
      })
      .select()
      .single();

    if (courseError) {
      console.error("❌ Error creating course:", courseError.message);
      return;
    }

    console.log("✅ Test course created!");
    console.log("📋 Course ID:", course.id);
    console.log("📋 Course Name:", course.name);

    // Create enrollment for the user
    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .upsert({
        user_id: uid,
        course_id: course.id,
      }, {
        onConflict: "user_id,course_id",
      })
      .select()
      .single();

    if (enrollmentError) {
      console.error("❌ Error creating enrollment:", enrollmentError.message);
      return;
    }

    console.log("✅ User enrolled in course!");
    console.log("📋 Enrollment ID:", enrollment.id);

  } catch (error) {
    console.error("❌ Unexpected error:", error.message);
  }
}

async function main() {
  console.log("🚀 Starting test script...");
  console.log("=" .repeat(50));
  
  // Initialize Supabase client
  await initSupabase();
  
  await addCanvasApiKey();
  await storeTestCourse();
  
  console.log("\n" + "=".repeat(50));
  console.log("✨ Test script completed!");
}

main();

