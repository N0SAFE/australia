import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import * as schema from '@/config/drizzle/schema';
import { eq } from 'drizzle-orm';
import { AuthService } from '@/core/modules/auth/services/auth.service';
import { DatabaseService } from '@/core/modules/database/services/database.service';
import { EnvService } from '@/config/env/env.service';
import { FileMetadataService } from '@/modules/storage/services/file-metadata.service';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

// Seed version identifier - increment this when you want to re-seed
const SEED_VERSION = '1.8.0';

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

// Helper function to upload a seed asset file using the FileMetadataService
async function uploadSeedAsset(
  fileMetadataService: FileMetadataService,
  assetFilename: string,
  type: 'image' | 'video' | 'audio',
  uploadedById?: string
): Promise<string> {
  try {
    // __dirname in dev: /app/apps/api/src/cli/commands
    // __dirname in prod: /app/apps/api/dist/cli/commands
    // Go up 3 levels from src/cli/commands OR dist/cli/commands to get to /app/apps/api
    // Then navigate to seed/assets
    const seedAssetsDir = path.join(__dirname, '../../../seed/assets');
    const typeDir = type === 'image' ? 'images' : type === 'video' ? 'videos' : 'audio';
    const sourcePath = path.join(seedAssetsDir, typeDir, assetFilename);
    
    console.log(`📋 Uploading ${type} asset: ${assetFilename}`);
    console.log(`   Source: ${sourcePath}`);
    
    // Read the source file
    const buffer = await fs.readFile(sourcePath);
    
    // Get file stats for metadata
    const stats = await fs.stat(sourcePath);
    const ext = path.extname(assetFilename);
    
    // Determine MIME type
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
    };
    const mimeType = mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
    
    // Create unique filename
    const uniqueSuffix = `${String(Date.now())}-${String(Math.round(Math.random() * 1e9))}`;
    const storedFilename = `${type}-${uniqueSuffix}${ext}`;
    
    // Build paths
    const relativePath = fileMetadataService.buildRelativePath(mimeType, storedFilename);
    const absoluteFilePath = path.join(process.cwd(), 'uploads', relativePath.replace(/^\//, ''));
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
    
    // Write file to destination
    await fs.writeFile(absoluteFilePath, buffer);
    
    // Register in database using appropriate method
    let dbResult;
    if (type === 'image') {
      dbResult = await fileMetadataService.createImageFile({
        filePath: relativePath,
        absoluteFilePath,
        filename: assetFilename,
        storedFilename,
        mimeType,
        size: stats.size,
        uploadedBy: uploadedById,
      });
    } else if (type === 'video') {
      dbResult = await fileMetadataService.createVideoFile({
        filePath: relativePath,
        absoluteFilePath,
        filename: assetFilename,
        storedFilename,
        mimeType,
        size: stats.size,
        uploadedBy: uploadedById,
      });
    } else {
      dbResult = await fileMetadataService.createAudioFile({
        filePath: relativePath,
        absoluteFilePath,
        filename: assetFilename,
        storedFilename,
        mimeType,
        size: stats.size,
        uploadedBy: uploadedById,
      });
    }
    
    console.log(`✅ Uploaded ${type} as: ${storedFilename} (File ID: ${dbResult.file.id})`);

    // Return the path that will be served by the API
    return `/storage/files/${storedFilename}`;
  } catch (error) {
    console.error(`❌ Failed to upload ${type} asset ${assetFilename}:`, error);
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
    private readonly fileMetadataService: FileMetadataService,
  ) {
    super();
  }

  async run(): Promise<void> {
    console.log("🌱 Seeding database...");

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
      // Upload seed files for demonstration
      const demoImage = await uploadSeedAsset(this.fileMetadataService, 'mountain-sunset.jpg', 'image', defaultAdminResult.user.id);
      const demoVideo = await uploadSeedAsset(this.fileMetadataService, 'big-buck-bunny.mp4', 'video', defaultAdminResult.user.id);
      const demoAudio = await uploadSeedAsset(this.fileMetadataService, 'soundhelix-song-1.mp3', 'audio', defaultAdminResult.user.id);
      
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, -30)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: {level: 1},
              content: [{type: 'text', text: 'Welcome to the Time Capsule Archive! 🎉'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'This is a text capsule that was opened 30 days ago. It contains a simple welcome message to introduce you to the concept of time capsules.'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'What are Time Capsules?'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'Time capsules allow you to store memories, messages, and media for a specific date in the future. When that date arrives, you can unlock and view the content.'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'Attached Files 📎'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'You can also attach files to your capsules. Here are some example files you can download:'}]
            },
            {
              type: 'paragraph',
              content: [
                {type: 'text', text: '🖼️ '},
                {
                  type: 'text',
                  marks: [{
                    type: 'link',
                    attrs: {href: demoImage, target: '_blank'}
                  }],
                  text: 'Download Mountain Sunset Image'
                },
                {type: 'text', text: ' - A beautiful sunset over mountain peaks'}
              ]
            },
            {
              type: 'paragraph',
              content: [
                {type: 'text', text: '🎬 '},
                {
                  type: 'text',
                  marks: [{
                    type: 'link',
                    attrs: {href: demoVideo, target: '_blank'}
                  }],
                  text: 'Download Big Buck Bunny Video'
                },
                {type: 'text', text: ' - Sample video content'}
              ]
            },
            {
              type: 'paragraph',
              content: [
                {type: 'text', text: '🎵 '},
                {
                  type: 'text',
                  marks: [{
                    type: 'link',
                    attrs: {href: demoAudio, target: '_blank'}
                  }],
                  text: 'Download Audio Track'
                },
                {type: 'text', text: ' - Sample music file'}
              ]
            },
            {
              type: 'paragraph',
              content: [{
                type: 'text',
                marks: [{type: 'bold'}],
                text: 'This capsule has been unlocked and is freely accessible.'
              }]
            }
          ]
        }),
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
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: {level: 1},
              content: [{type: 'text', text: 'Unlocked but Unread 📬'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'This capsule was unlocked a few days ago but never opened. Sometimes we unlock things without taking the time to truly see what\'s inside.'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'A Waiting Message'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'The content has been accessible for days, but it patiently waits for someone to finally read it. What other opportunities in life are we missing by not following through?'}]
            },
            {
              type: 'blockquote',
              content: [{
                type: 'paragraph',
                content: [{type: 'text', text: 'Having access is not the same as engaging with what\'s available.'}]
              }]
            }
          ]
        }),
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
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: {level: 1},
              content: [{type: 'text', text: 'The Locked Archive 🔐'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'This capsule has been available for 15 days but remains locked. The code protects valuable memories waiting to be discovered.'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'Hint'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'The code is the year this project was created: 2024'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'What Awaits'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'Behind this lock is a collection of thoughts and reflections from the past. Once unlocked, you\'ll gain access to memories that have been preserved in time.'}]
            }
          ]
        }),
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
      const pastImagePath = await uploadSeedAsset(this.fileMetadataService, 'forest-trail.jpg', 'image', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, -10)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: {level: 1},
              content: [{type: 'text', text: 'Forgotten Discovery 🗝️'}]
            },
            {
              type: 'image',
              attrs: {
                src: pastImagePath,
                srcUrlId: 'api',
                alt: 'Forest Trail - A serene path through the forest',
                width: 1920,
                height: 1280
              }
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'Unlocked but Unexplored'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'Someone took the time to unlock this capsule 10 days ago, but the content remains unseen. The lock was opened, but the door was never crossed.'}]
            }
          ]
        }),
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
      const image1Path = await uploadSeedAsset(this.fileMetadataService, 'mountain-sunset.jpg', 'image', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 7)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: {
                src: image1Path,                srcUrlId: 'api',                alt: 'Mountain Sunset - A beautiful sunset over mountain peaks',
                width: 1920,
                height: 1080
              }
            }
          ]
        }),
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
      const video1Path = await uploadSeedAsset(this.fileMetadataService, 'big-buck-bunny.mp4', 'video', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 14)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'video',
              attrs: {
                src: video1Path,
                srcUrlId: 'api',
                title: 'Mixed Content Video',
                width: 1920,
                height: 1080,
                controls: true
              }
            }
          ]
        }),
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
      const audio1Path = await uploadSeedAsset(this.fileMetadataService, 'soundhelix-song-1.mp3', 'audio', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 21)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'audio',
              attrs: {
                src: audio1Path,
                srcUrlId: 'api',
                title: 'Sample Audio - Soundhelix Song',
                controls: true
              }
            }
          ]
        }),
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
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: {level: 1},
              content: [{type: 'text', text: 'Hidden Message 🔐'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'This capsule is protected by a tilt lock. You need to tilt your device to a specific angle to unlock it.'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'The Secret'}]
            },
            {
              type: 'blockquote',
              content: [{
                type: 'paragraph',
                content: [{type: 'text', text: 'Once unlocked, you\'ll discover that perseverance pays off. The journey to access this content makes it all the more valuable.'}]
              }]
            },
            {
              type: 'heading',
              attrs: {level: 3},
              content: [{type: 'text', text: 'Instructions'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'Tilt your device to at least 45 degrees to unlock this capsule!'}]
            }
          ]
        }),
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
      const image2Path = await uploadSeedAsset(this.fileMetadataService, 'forest-trail.jpg', 'image', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 35)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: {
                src: image2Path,
                srcUrlId: 'api',
                alt: 'Forest Trail - A serene path through the forest',
                width: 1920,
                height: 1280
              }
            }
          ]
        }),
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
      const video2Path = await uploadSeedAsset(this.fileMetadataService, 'elephants-dream.mp4', 'video', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 42)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'video',
              attrs: {
                src: video2Path,
                srcUrlId: 'api'
              }
            }
          ]
        }),
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
      const audio2Path = await uploadSeedAsset(this.fileMetadataService, 'soundhelix-song-2.mp3', 'audio', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 49)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'audio',
              attrs: {
                src: audio2Path,
                srcUrlId: 'api'
              }
            }
          ]
        }),
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
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: {level: 1},
              content: [{type: 'text', text: 'A Week Ago'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'This capsule was opened exactly one week ago. It serves as a reminder that time passes quickly, and moments become memories.'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'Reflection'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'Look back at what you were doing a week ago. How have things changed? What have you learned?'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'A Note on Waiting'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'Good things come to those who wait. This capsule has been waiting for exactly the right moment to be opened, and now that moment has passed.'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'What\'s Next?'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'There are many more capsules waiting to be discovered. Some are locked, some are free, but all contain something special.'}]
            }
          ]
        }),
        openingMessage: 'Opened last week - Patience rewarded!',
        isLocked: false,
        lockType: null,
        lockConfig: null,
        unlockedAt: addDays(today, -7),
        openedAt: addDays(today, -7),
      });

      // 10. IMAGE CONTENT - Opening today, no lock
      const image3Path = await uploadSeedAsset(this.fileMetadataService, 'ocean-waves.jpg', 'image', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(today),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'image',
              attrs: {
                src: image3Path,
                srcUrlId: 'api',
                alt: 'Ocean Waves - Powerful waves crashing on the shore',
                width: 1920,
                height: 1280
              }
            }
          ]
        }),
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
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: {level: 1},
              content: [{type: 'text', text: 'The Secret Code'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'Behind this alphanumeric lock lies a message about discovery and persistence.'}]
            },
            {
              type: 'heading',
              attrs: {level: 2},
              content: [{type: 'text', text: 'For the Curious'}]
            },
            {
              type: 'paragraph',
              content: [{type: 'text', text: 'Those who seek shall find. The code to unlock this capsule is hidden in plain sight, waiting for someone observant enough to notice the patterns around them.'}]
            },
            {
              type: 'paragraph',
              content: [{
                type: 'text',
                marks: [{type: 'bold'}],
                text: 'Once unlocked, you\'ll understand that the journey was worth it.'
              }]
            }
          ]
        }),
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
      const video3Path = await uploadSeedAsset(this.fileMetadataService, 'for-bigger-blazes.mp4', 'video', defaultAdminResult.user.id);
      capsulesData.push({
        id: randomUUID(),
        openingDate: formatDate(addDays(today, 90)),
        content: JSON.stringify({
          type: 'doc',
          content: [
            {
              type: 'video',
              attrs: {
                src: video3Path,
                srcUrlId: 'api'
              }
            }
          ]
        }),
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
