import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import * as schema from '@/config/drizzle/schema';
import { eq } from 'drizzle-orm';
import { AuthService } from '@/core/modules/auth/services/auth.service';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { EnvService } from '@/config/env/env.service';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Seed version identifier - increment this when you want to re-seed
const SEED_VERSION = '1.7.2';

// Helper function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper function to copy a seed asset file to uploads directory
async function copySeedAsset(uploadDir: string, assetFilename: string, type: 'image' | 'video' | 'audio'): Promise<string> {
  try {
    // __dirname in dev: /app/apps/api/src/cli/commands
    // __dirname in prod: /app/apps/api/dist/cli/commands
    // Go up 3 levels from src/cli/commands OR dist/cli/commands to get to /app/apps/api
    // Then navigate to seed/assets
    const seedAssetsDir = path.join(__dirname, '../../../seed/assets');
    const typeDir = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'audio';
    const sourcePath = path.join(seedAssetsDir, typeDir, assetFilename);
    
    console.log(`📋 Copying ${type} asset: ${assetFilename}`);
    console.log(`   Source: ${sourcePath}`);
    console.log(`   __dirname: ${__dirname}`);
    console.log(`   process.cwd(): ${process.cwd()}`);
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Get file extension
    const ext = path.extname(assetFilename);
    
    // Create unique filename
    const uniqueSuffix = `${String(Date.now())}-${String(Math.round(Math.random() * 1e9))}`;
    const filename = `${type}-${uniqueSuffix}${ext}`;
    const destPath = path.join(uploadDir, filename);

    // Copy file
    await fs.copyFile(sourcePath, destPath);
    console.log(`✅ Copied ${type} as: ${filename}`);

    // Return the path that will be served by the API
    return `/storage/files/${filename}`;
  } catch (error) {
    console.error(`❌ Failed to copy ${type} asset ${assetFilename}:`, error);
    throw error;
  }
}

@Injectable()
@Command({
  name: "seed",
  description: "Seed the database with initial data",
})
export class SeedCommand extends CommandRunner {
  constructor(
    private readonly databaseService: DatabaseService,
		private readonly authService: AuthService,
    private readonly envService: EnvService,
  ) {
    super();
  }

  async run(): Promise<void> {
    console.log("🌱 Seeding database...");

    // Get uploads directory from environment
    const uploadDir = this.envService.get('UPLOADS_DIR');

    try {
      // Check if this seed version has already been applied
      const existingSeed = await this.databaseService.db
        .select()
        .from(schema.seedVersion)
        .where(eq(schema.seedVersion.version, SEED_VERSION))
        .limit(1);

      if (existingSeed.length > 0) {
        console.log(`✅ Seed version ${SEED_VERSION} already applied at ${existingSeed[0].appliedAt.toISOString()}`);
        console.log('   Skipping seeding. To re-seed, increment SEED_VERSION in seed.command.ts');
        return;
      }

      console.log(`📦 Applying seed version ${SEED_VERSION}...`);
      
      // Create default admin user first
      console.log('👤 Creating default admin user...');
      const defaultAdminEmail = 'admin@admin.com';
      const defaultAdminPassword = 'adminadmin';
      
      const defaultAdminResult = await this.authService.api.createUser({
        body: {
          name: 'Default Admin',
          email: defaultAdminEmail,
          password: defaultAdminPassword,
          data: { 
            role: 'admin', 
            emailVerified: true, 
            image: 'https://avatars.githubusercontent.com/u/1?v=4'
          },
        },
      });
      
      console.log(`✅ Created default admin user: ${defaultAdminEmail} (ID: ${defaultAdminResult.user.id})`);
      console.log(`   Password: ${defaultAdminPassword}`);
      console.log(`   Role: admin`);
      
      // Create test users for sarah and admin roles
      const seededData = { users: [] as { role: string; id: string; email: string; password: string }[] };

      // Add default admin to seeded data
      seededData.users.push({ 
        role: 'admin', 
        id: defaultAdminResult.user.id, 
        email: defaultAdminEmail, 
        password: defaultAdminPassword 
      });

      // Create sarah test users
      console.log('👤 Creating sarah test users...');
      for (let i = 1; i <= 2; i++) {
        const email = `sarah${String(i)}@test.com`;
        const password = 'password123';
        const userResult = await this.authService.api.createUser({
          body: {
            name: `Sarah User ${String(i)}`,
            email,
            password,
            data: { 
              role: 'sarah', 
              emailVerified: true, 
              image: `https://avatars.githubusercontent.com/u/${String(i + 10)}?v=4`
            },
          },
        });
        const user = userResult.user;
        seededData.users.push({ role: 'sarah', id: user.id, email, password });
        console.log(`✅ Created sarah user ${String(i)}: ${email} (ID: ${user.id})`);
      }

      // Create admin test users (in addition to default admin)
      console.log('👤 Creating admin test users...');
      for (let i = 1; i <= 2; i++) {
        const email = `admin${String(i)}@test.com`;
        const password = 'password123';
        const userResult = await this.authService.api.createUser({
          body: {
            name: `Admin User ${String(i)}`,
            email,
            password,
            data: { 
              role: 'admin', 
              emailVerified: true, 
              image: `https://avatars.githubusercontent.com/u/${String(i + 20)}?v=4`
            },
          },
        });
        const user = userResult.user;
        seededData.users.push({ role: 'admin', id: user.id, email, password });
        console.log(`✅ Created admin user ${String(i)}: ${email} (ID: ${user.id})`);
      }

      // Seed capsules with diverse content types and lock mechanisms
      console.log('🎁 Seeding capsules with multi-type content and locks...');
      console.log('📋 Copying media files from seed assets to uploads directory...');
      
      const today = new Date();
      
      // Prepare capsules data with Plate.js JSON content
      console.log('📝 Creating capsules with unified content...');
      
      const capsulesData: {
        id: string;
        openingDate: string;
        content: string;
        openingMessage: string | null;
        isLocked?: boolean;
        lockType?: 'code' | 'voice' | 'device_shake' | 'device_tilt' | 'device_tap' | 'api' | 'time_based' | null;
        lockConfig?: string | null;
        unlockedAt?: Date | null;
        openedAt?: Date | null;
      }[] = [];

      // 1. TEXT CONTENT WITH FILE LINKS - Past opening date (already unlocked AND opened)
      // Copy seed files for demonstration
      const demoImage = await copySeedAsset(uploadDir, 'mountain-sunset.jpg', 'image');
      const demoVideo = await copySeedAsset(uploadDir, 'big-buck-bunny.mp4', 'video');
      const demoAudio = await copySeedAsset(uploadDir, 'soundhelix-song-1.mp3', 'audio');
      
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, -30)),
        content: JSON.stringify([
          {
            type: 'h1',
            children: [{text: 'Welcome to the Time Capsule Archive! 🎉'}]
          },
          {
            type: 'p',
            children: [{text: 'This is a text capsule that was opened 30 days ago. It contains a simple welcome message to introduce you to the concept of time capsules.'}]
          },
          {
            type: 'h2',
            children: [{text: 'What are Time Capsules?'}]
          },
          {
            type: 'p',
            children: [{text: 'Time capsules allow you to store memories, messages, and media for a specific date in the future. When that date arrives, you can unlock and view the content.'}]
          },
          {
            type: 'h2',
            children: [{text: 'Attached Files 📎'}]
          },
          {
            type: 'p',
            children: [
              {text: 'You can also attach files to your capsules. Here are some example files you can download:'},
            ]
          },
          {
            type: 'p',
            children: [
              {text: '🖼️ '},
              {
                type: 'a',
                href: demoImage,
                children: [{text: 'Download Mountain Sunset Image'}]
              },
              {text: ' - A beautiful sunset over mountain peaks'}
            ]
          },
          {
            type: 'p',
            children: [
              {text: '🎬 '},
              {
                type: 'a',
                href: demoVideo,
                children: [{text: 'Download Big Buck Bunny Video'}]
              },
              {text: ' - Sample video content'}
            ]
          },
          {
            type: 'p',
            children: [
              {text: '🎵 '},
              {
                type: 'a',
                href: demoAudio,
                children: [{text: 'Download Audio Track'}]
              },
              {text: ' - Sample music file'}
            ]
          },
          {
            type: 'p',
            children: [{text: 'This capsule has been unlocked and is freely accessible.', bold: true}]
          }
        ]),
        openingMessage: 'Opened 30 days ago - Welcome message delivered with file attachments!',
        isLocked: false,
        lockType: null,
        lockConfig: null,
        unlockedAt: addDays(today, -30),
        openedAt: addDays(today, -30),
      });

      // 1b. PAST CAPSULE - Unlocked but NOT opened (user unlocked it but never viewed) - CURRENT MONTH
      // Calculate a date in current month but in the past
      const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), Math.max(1, today.getDate() - 5));
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(currentMonthDate),
        content: JSON.stringify([
          {
            type: 'h1',
            children: [{text: 'Unlocked but Unread 📬'}]
          },
          {
            type: 'p',
            children: [{text: 'This capsule was unlocked a few days ago but never opened. Sometimes we unlock things without taking the time to truly see what\'s inside.'}]
          },
          {
            type: 'h2',
            children: [{text: 'A Waiting Message'}]
          },
          {
            type: 'p',
            children: [{text: 'The content has been accessible for days, but it patiently waits for someone to finally read it. What other opportunities in life are we missing by not following through?'}]
          },
          {
            type: 'blockquote',
            children: [{text: 'Having access is not the same as engaging with what\'s available.'}]
          }
        ]),
        openingMessage: 'Unlocked a few days ago but still waiting to be read...',
        isLocked: true, // Still locked
        lockType: 'code',
        lockConfig: JSON.stringify({
          type: 'code',
          code: '1111', // Code to unlock
        }),
        unlockedAt: null, // Not unlocked yet
        openedAt: null, // Not opened yet
      });

      // 1c. PAST CAPSULE - Locked with CODE (not unlocked yet)
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, -15)),
        content: JSON.stringify([
          {
            type: 'h1',
            children: [{text: 'The Locked Archive 🔐'}]
          },
          {
            type: 'p',
            children: [{text: 'This capsule has been available for 15 days but remains locked. The code protects valuable memories waiting to be discovered.'}]
          },
          {
            type: 'h2',
            children: [{text: 'Hint'}]
          },
          {
            type: 'p',
            children: [{text: 'The code is the year this project was created: 2024'}]
          },
          {
            type: 'h2',
            children: [{text: 'What Awaits'}]
          },
          {
            type: 'p',
            children: [{text: 'Behind this lock is a collection of thoughts and reflections from the past. Once unlocked, you\'ll gain access to memories that have been preserved in time.'}]
          }
        ]),
        openingMessage: 'Available for 15 days - Still locked and waiting...',
        isLocked: true,
        lockType: 'code',
        lockConfig: JSON.stringify({
          type: 'code',
          code: '2024',
          attempts: 3,
        }),
        unlockedAt: null,
        openedAt: null,
      });

      // 1d. PAST CAPSULE - Was locked, unlocked but not opened
      const pastImagePath = await copySeedAsset(uploadDir, 'forest-trail.jpg', 'image');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, -10)),
        content: JSON.stringify([
          {
            type: 'h1',
            children: [{text: 'Forgotten Discovery 🗝️'}]
          },
          {
            type: 'img',
            url: pastImagePath,
            alt: 'Forest Trail - A serene path through the forest',
            width: 1920,
            height: 1280,
            children: []
          },
          {
            type: 'h2',
            children: [{text: 'Unlocked but Unexplored'}]
          },
          {
            type: 'p',
            children: [{text: 'Someone took the time to unlock this capsule 10 days ago, but the content remains unseen. The lock was opened, but the door was never crossed.'}]
          }
        ]),
        openingMessage: 'Unlocked 10 days ago - Content still waiting to be discovered',
        isLocked: false, // Fixed: unlocked capsules should have isLocked:false
        lockType: 'code', // Keep track of original lock type
        lockConfig: JSON.stringify({
          type: 'code',
          code: '5678', // Code that was used to unlock
        }),
        unlockedAt: addDays(today, -10), // Unlocked
        openedAt: null, // But never opened
      });

      // 2. IMAGE CONTENT - Locked with CODE (simple)
      const image1Path = await copySeedAsset(uploadDir, 'mountain-sunset.jpg', 'image');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 7)),
        content: JSON.stringify([
          {
            type: 'img',
            url: image1Path,
            alt: 'Mountain Sunset - A beautiful sunset over mountain peaks',
            width: 1920,
            height: 1080,
            children: []
          }
        ]),
        openingMessage: null,
        isLocked: true,
        lockType: 'code',
        lockConfig: JSON.stringify({
          type: 'code',
          code: '1234',
        }),
        unlockedAt: null,
      });

      // 3. VIDEO CONTENT - Locked with VOICE
      const video1Path = await copySeedAsset(uploadDir, 'big-buck-bunny.mp4', 'video');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 14)),
        content: JSON.stringify([
          {
            type: 'video',
            url: video1Path,
            children: []
          }
        ]),
        openingMessage: null,
        isLocked: true,
        lockType: 'voice',
        lockConfig: JSON.stringify({
          type: 'voice',
          phrase: 'open sesame',
          language: 'en-US',
        }),
        unlockedAt: null,
      });

      // 4. AUDIO CONTENT - Locked with DEVICE_SHAKE
      const audio1Path = await copySeedAsset(uploadDir, 'soundhelix-song-1.mp3', 'audio');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 21)),
        content: JSON.stringify([
          {
            type: 'audio',
            url: audio1Path,
            children: []
          }
        ]),
        openingMessage: null,
        isLocked: true,
        lockType: 'device_shake',
        lockConfig: JSON.stringify({
          type: 'device_shake',
          threshold: 15,
        }),
        unlockedAt: null,
      });

      // 5. TEXT CONTENT - Locked with DEVICE_TILT
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 28)),
        content: JSON.stringify([
          {
            type: 'h1',
            children: [{text: 'Hidden Message 🔐'}]
          },
          {
            type: 'p',
            children: [{text: 'This capsule is protected by a tilt lock. You need to tilt your device to a specific angle to unlock it.'}]
          },
          {
            type: 'h2',
            children: [{text: 'The Secret'}]
          },
          {
            type: 'blockquote',
            children: [{text: 'Once unlocked, you\'ll discover that perseverance pays off. The journey to access this content makes it all the more valuable.'}]
          },
          {
            type: 'h3',
            children: [{text: 'Instructions'}]
          },
          {
            type: 'p',
            children: [{text: 'Tilt your device to at least 45 degrees to unlock this capsule!'}]
          }
        ]),
        openingMessage: null,
        isLocked: true,
        lockType: 'device_tilt',
        lockConfig: JSON.stringify({
          type: 'device_tilt',
          angle: 45,
        }),
        unlockedAt: null,
      });

      // 6. IMAGE CONTENT - Locked with DEVICE_TAP
      const image2Path = await copySeedAsset(uploadDir, 'forest-trail.jpg', 'image');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 35)),
        content: JSON.stringify([
          {
            type: 'img',
            url: image2Path,
            alt: 'Forest Trail - A serene path through the forest',
            width: 1920,
            height: 1280,
            children: []
          }
        ]),
        openingMessage: null,
        isLocked: true,
        lockType: 'device_tap',
        lockConfig: JSON.stringify({
          type: 'device_tap',
          taps: 5,
          timeout: 3000,
        }),
        unlockedAt: null,
      });

      // 7. VIDEO CONTENT - Locked with API
      const video2Path = await copySeedAsset(uploadDir, 'elephants-dream.mp4', 'video');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 42)),
        content: JSON.stringify([
          {
            type: 'video',
            url: video2Path,
            children: []
          }
        ]),
        openingMessage: null,
        isLocked: true,
        lockType: 'api',
        lockConfig: JSON.stringify({
          type: 'api',
          endpoint: '/api/challenge/verify',
          method: 'POST',
        }),
        unlockedAt: null,
      });

      // 8. AUDIO CONTENT - No lock, future opening
      const audio2Path = await copySeedAsset(uploadDir, 'soundhelix-song-2.mp3', 'audio');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 49)),
        content: JSON.stringify([
          {
            type: 'audio',
            url: audio2Path,
            children: []
          }
        ]),
        openingMessage: null,
        isLocked: false,
        lockType: null,
        lockConfig: null,
        unlockedAt: null,
      });

      // 9. TEXT CONTENT - Past opening date (already unlocked), week ago
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, -7)),
        content: JSON.stringify([
          {
            type: 'h1',
            children: [{text: 'A Week Ago'}]
          },
          {
            type: 'p',
            children: [{text: 'This capsule was opened exactly one week ago. It serves as a reminder that time passes quickly, and moments become memories.'}]
          },
          {
            type: 'h2',
            children: [{text: 'Reflection'}]
          },
          {
            type: 'p',
            children: [{text: 'Look back at what you were doing a week ago. How have things changed? What have you learned?'}]
          },
          {
            type: 'h2',
            children: [{text: 'A Note on Waiting'}]
          },
          {
            type: 'p',
            children: [{text: 'Good things come to those who wait. This capsule has been waiting for exactly the right moment to be opened, and now that moment has passed.'}]
          },
          {
            type: 'h2',
            children: [{text: 'What\'s Next?'}]
          },
          {
            type: 'p',
            children: [{text: 'There are many more capsules waiting to be discovered. Some are locked, some are free, but all contain something special.'}]
          }
        ]),
        openingMessage: 'Opened last week - Patience rewarded!',
        isLocked: false,
        lockType: null,
        lockConfig: null,
        unlockedAt: addDays(today, -7),
        openedAt: addDays(today, -7),
      });

      // 10. IMAGE CONTENT - Opening today, no lock
      const image3Path = await copySeedAsset(uploadDir, 'ocean-waves.jpg', 'image');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(today),
        content: JSON.stringify([
          {
            type: 'img',
            url: image3Path,
            alt: 'Ocean Waves - Powerful waves crashing on the shore',
            width: 1920,
            height: 1280,
            children: []
          }
        ]),
        openingMessage: null,
        isLocked: false,
        lockType: null,
        lockConfig: null,
        unlockedAt: null,
      });

      // 11. TEXT CONTENT - Locked with CODE (alphanumeric)
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 60)),
        content: JSON.stringify([
          {
            type: 'h1',
            children: [{text: 'The Secret Code'}]
          },
          {
            type: 'p',
            children: [{text: 'Behind this alphanumeric lock lies a message about discovery and persistence.'}]
          },
          {
            type: 'h2',
            children: [{text: 'For the Curious'}]
          },
          {
            type: 'p',
            children: [{text: 'Those who seek shall find. The code to unlock this capsule is hidden in plain sight, waiting for someone observant enough to notice the patterns around them.'}]
          },
          {
            type: 'p',
            children: [{text: 'Once unlocked, you\'ll understand that the journey was worth it.', bold: true}]
          }
        ]),
        openingMessage: null,
        isLocked: true,
        lockType: 'code',
        lockConfig: JSON.stringify({
          type: 'code',
          code: 'TIME2024',
          attempts: 5,
        }),
        unlockedAt: null,
      });

      // 12. VIDEO CONTENT - Far future, no lock
      const video3Path = await copySeedAsset(uploadDir, 'for-bigger-blazes.mp4', 'video');
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 90)),
        content: JSON.stringify([
          {
            type: 'video',
            url: video3Path,
            children: []
          }
        ]),
        openingMessage: null,
        isLocked: false,
        lockType: null,
        lockConfig: null,
        unlockedAt: null,
      });

      // Insert all capsules
      await this.databaseService.db.insert(schema.capsule).values(capsulesData);
      console.log(`✅ Created ${String(capsulesData.length)} global capsules with diverse content and locks`);
      console.log(`📊 Capsule States:`);
      console.log(`   - Past capsules (opened): ${String(capsulesData.filter(c => c.openedAt && new Date(c.openingDate) < today).length)}`);
      console.log(`   - Past capsules (unlocked but not opened): ${String(capsulesData.filter(c => c.unlockedAt && !c.openedAt && new Date(c.openingDate) < today).length)}`);
      console.log(`   - Past capsules (still locked): ${String(capsulesData.filter(c => c.isLocked && !c.unlockedAt && new Date(c.openingDate) < today).length)}`);
      console.log(`   - Future capsules: ${String(capsulesData.filter(c => new Date(c.openingDate) > today).length)}`);

      // Record that this seed version has been applied
      await this.databaseService.db.insert(schema.seedVersion).values({
        version: SEED_VERSION,
      });

      console.log(`✅ Database seeded successfully with sarah and admin users (version ${SEED_VERSION})`);
      console.log(`📊 Summary:`);
      console.log(`   - Users: ${String(seededData.users.length)}`);
      console.log(`   - Capsules: ${String(capsulesData.length)}`);
    } catch (error) {
      console.error("❌ Seeding failed:", error);
      throw error;
    }
  }
}
