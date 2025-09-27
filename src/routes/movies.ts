import { Hono } from 'hono';
import type { Env } from '../types';

const movies = new Hono<{ Bindings: Env }>();

// Helper function to generate mock video data
function generateMockVideo(id: number, category: string, badge?: string) {
  const titles = [
    'Breaking: Major Development in Phnom Penh',
    'Traditional Khmer Dance Performance',
    'Cambodia Tech Startup Success Story',
    'Angkor Wat Documentary Special',
    'Comedy Night at BAM Studios',
    'Live Concert: Khmer Music Festival',
    'Street Food Tour: Best of Cambodia',
    'BAM Exclusive: Behind the Scenes',
    'Community Heroes: Local Impact',
    'Sports Highlights: National Team Victory'
  ];

  return {
    id: `video_${category}_${id}`,
    title: titles[id % titles.length],
    description: 'Experience the best of Cambodian content on BAM',
    thumbnail: `https://picsum.photos/seed/${category}${id}/640/360`,
    preview_url: '/preview.mp4',
    video_url: '/full_video.mp4',
    category: category,
    views: Math.floor(Math.random() * 5000000),
    duration: `${Math.floor(Math.random() * 30)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
    progress: Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 0,
    badge: badge,
    release_date: '2024-01-01',
    vote_average: 7.5 + Math.random() * 2.5
  };
}

// Browse endpoint - Main homepage
movies.post('/browse', async (c) => {
  const { region = 'KH' } = await c.req.json();
  const env = c.env;

  try {
    // Hero Carousel - Featured content
    const heroContent = Array.from({ length: 5 }, (_, i) =>
      generateMockVideo(i, 'featured', 'Featured')
    );

    // Generate mock data for each category
    const browseData = [
      {
        _id: 0,
        title: "Hero Carousel",
        type: "hero",
        shortList: false,
        movies: heroContent
      },
      {
        _id: 1,
        title: "You May Like It!",
        type: "personalized",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'recommended'))
      },
      {
        _id: 2,
        title: "People Keep Watching It!",
        type: "continue",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, 'popular');
          video.progress = 20 + Math.floor(Math.random() * 60); // Show progress
          return video;
        })
      },
      {
        _id: 3,
        title: "OMG! (Controversial)",
        type: "viral",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) =>
          generateMockVideo(i, 'controversial', 'OMG!')
        )
      },
      {
        _id: 4,
        title: "The World Is Watching Cambodia!",
        type: "global",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) =>
          generateMockVideo(i, 'cambodia', 'Global Spotlight')
        )
      },
      {
        _id: 5,
        title: "Best Hit!",
        type: "trending",
        shortList: true,
        movies: Array.from({ length: 10 }, (_, i) => {
          const video = generateMockVideo(i, 'trending', `#${i + 1}`);
          video.views = 5000000 - (i * 400000); // Descending view count
          return video;
        })
      },
      {
        _id: 6,
        title: "Laughing Is Good!",
        type: "comedy",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) =>
          generateMockVideo(i, 'comedy', '😂')
        )
      },
      {
        _id: 7,
        title: "BAM Originals",
        type: "originals",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) =>
          generateMockVideo(i, 'originals', 'BAM Original')
        )
      },
      {
        _id: 8,
        title: "Don't Miss the Event",
        type: "events",
        shortList: false,
        movies: Array.from({ length: 6 }, (_, i) => {
          const video = generateMockVideo(i, 'events', 'Live Event');
          video.title = `BAM Festival ${new Date().getFullYear()} - Day ${i + 1}`;
          return video;
        })
      },
      {
        _id: 9,
        title: "Community Pick",
        type: "community",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) =>
          generateMockVideo(i, 'community', 'Community Pick')
        )
      },
      {
        _id: 10,
        title: "My List",
        shortList: false,
        movies: [] // Will be populated from user's watchlist
      }
    ];

    const response = {
      status: 'success',
      result: browseData.length,
      data: browseData
    };

    // Cache for 1 hour
    const cacheKey = `browse:${region}`;
    await env.CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: 3600
    });

    return c.json(response);
  } catch (error) {
    console.error('Browse error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch browse data'
    }, 500);
  }
});

// Politics category
movies.post('/browse/politics', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const politicsData = [
      {
        _id: 0,
        title: "Latest Political News",
        type: "politics",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, 'politics');
          video.title = `Political Update: ${['Parliament Session', 'Policy Discussion', 'Minister Interview', 'Economic Forum'][i % 4]}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Government Announcements",
        type: "politics",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'government', 'Official'))
      },
      {
        _id: 2,
        title: "Political Analysis",
        type: "politics",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'analysis'))
      }
    ];

    return c.json({
      status: 'success',
      result: politicsData.length,
      data: politicsData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch politics content'
    }, 500);
  }
});

// World category
movies.post('/browse/world', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const worldData = [
      {
        _id: 0,
        title: "International News",
        type: "world",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, 'world');
          video.title = `World News: ${['Asia Pacific', 'Europe', 'Americas', 'Africa'][i % 4]} Update`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Global Economy",
        type: "world",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'economy'))
      },
      {
        _id: 2,
        title: "International Relations",
        type: "world",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'diplomacy'))
      }
    ];

    return c.json({
      status: 'success',
      result: worldData.length,
      data: worldData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch world content'
    }, 500);
  }
});

// Music category
movies.post('/browse/music', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const musicData = [
      {
        _id: 0,
        title: "Khmer Music Hits",
        type: "music",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, 'music', '🎵');
          video.title = `Top Khmer Songs ${new Date().getFullYear()}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Live Concerts",
        type: "music",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'concerts', 'Live'))
      },
      {
        _id: 2,
        title: "Music Videos",
        type: "music",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'music-videos'))
      }
    ];

    return c.json({
      status: 'success',
      result: musicData.length,
      data: musicData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch music content'
    }, 500);
  }
});

// Cars & Motos category
movies.post('/browse/cars-motos', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const carsData = [
      {
        _id: 0,
        title: "Car Reviews",
        type: "cars",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, 'cars', '🚗');
          video.title = `${['Toyota', 'Honda', 'Lexus', 'BMW'][i % 4]} ${new Date().getFullYear()} Review`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Motorcycle Culture",
        type: "motos",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'motos', '🏍️'))
      },
      {
        _id: 2,
        title: "Auto Shows & Events",
        type: "auto-events",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'auto-shows'))
      }
    ];

    return c.json({
      status: 'success',
      result: carsData.length,
      data: carsData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch cars & motos content'
    }, 500);
  }
});

// Sports category
movies.post('/browse/sports', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const sportsData = [
      {
        _id: 0,
        title: "Football Highlights",
        type: "sports",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, 'football', '⚽');
          video.title = `Cambodia vs ${['Thailand', 'Vietnam', 'Philippines', 'Malaysia'][i % 4]}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Kun Khmer Boxing",
        type: "sports",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'boxing', '🥊'))
      },
      {
        _id: 2,
        title: "SEA Games Highlights",
        type: "sports",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'seagames', '🏅'))
      }
    ];

    return c.json({
      status: 'success',
      result: sportsData.length,
      data: sportsData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch sports content'
    }, 500);
  }
});

// Travel category
movies.post('/browse/travel', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const travelData = [
      {
        _id: 0,
        title: "Discover Cambodia",
        type: "travel",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, 'travel', '✈️');
          video.title = `Explore ${['Siem Reap', 'Phnom Penh', 'Sihanoukville', 'Kampot'][i % 4]}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Hidden Gems",
        type: "travel",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'hidden-gems', '💎'))
      },
      {
        _id: 2,
        title: "Food & Culture Tours",
        type: "travel",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'food-culture', '🍜'))
      }
    ];

    return c.json({
      status: 'success',
      result: travelData.length,
      data: travelData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch travel content'
    }, 500);
  }
});

// Made in Cambodia category
movies.post('/browse/made-in-cambodia', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const cambodiaData = [
      {
        _id: 0,
        title: "Khmer Movies & Series",
        type: "cambodia",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) =>
          generateMockVideo(i, 'khmer-movies', '🇰🇭')
        )
      },
      {
        _id: 1,
        title: "Local Businesses Success",
        type: "cambodia",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'business', 'Made in KH'))
      },
      {
        _id: 2,
        title: "Cambodian Innovations",
        type: "cambodia",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'innovation', '🚀'))
      }
    ];

    return c.json({
      status: 'success',
      result: cambodiaData.length,
      data: cambodiaData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch Made in Cambodia content'
    }, 500);
  }
});

// Latest category
movies.post('/browse/latest', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const latestData = [
      {
        _id: 0,
        title: "Just Added Today",
        type: "latest",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => {
          const video = generateMockVideo(i, 'latest', 'New');
          video.release_date = new Date().toISOString().split('T')[0];
          return video;
        })
      },
      {
        _id: 1,
        title: "This Week's Uploads",
        type: "latest",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'week', 'This Week'))
      },
      {
        _id: 2,
        title: "Trending Now",
        type: "latest",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'trending-now', '🔥'))
      }
    ];

    return c.json({
      status: 'success',
      result: latestData.length,
      data: latestData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch latest content'
    }, 500);
  }
});

// Events category
movies.post('/browse/events', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const eventsData = [
      {
        _id: 0,
        title: "Upcoming BAM Events",
        type: "events",
        shortList: false,
        movies: Array.from({ length: 6 }, (_, i) => {
          const video = generateMockVideo(i, 'upcoming', 'Upcoming');
          video.title = `BAM ${['Music Festival', 'Comedy Night', 'Tech Summit', 'Film Festival'][i % 4]} ${new Date().getFullYear()}`;
          return video;
        })
      },
      {
        _id: 1,
        title: "Past Event Highlights",
        type: "events",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'past-events', 'Replay'))
      },
      {
        _id: 2,
        title: "Live Streaming Events",
        type: "events",
        shortList: false,
        movies: Array.from({ length: 6 }, (_, i) => generateMockVideo(i, 'live', '🔴 LIVE'))
      }
    ];

    return c.json({
      status: 'success',
      result: eventsData.length,
      data: eventsData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch events content'
    }, 500);
  }
});

// Keep the kids endpoint for family content
movies.post('/browse/kids', async (c) => {
  const { region = 'KH' } = await c.req.json();

  try {
    const kidsData = [
      {
        _id: 0,
        title: "Educational Shows",
        type: "kids",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) =>
          generateMockVideo(i, 'education', '📚')
        )
      },
      {
        _id: 1,
        title: "Cartoons & Animation",
        type: "kids",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'cartoons', '🎨'))
      },
      {
        _id: 2,
        title: "Family Movies",
        type: "kids",
        shortList: false,
        movies: Array.from({ length: 18 }, (_, i) => generateMockVideo(i, 'family', '👨‍👩‍👧‍👦'))
      }
    ];

    return c.json({
      status: 'success',
      result: kidsData.length,
      data: kidsData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch kids content'
    }, 500);
  }
});

// Legacy routes for compatibility
movies.post('/browse/genre/tv_shows', async (c) => {
  return movies.post('/browse/latest', c);
});

movies.post('/browse/genre/movies', async (c) => {
  return movies.post('/browse/made-in-cambodia', c);
});

movies.post('/browse/kids/tv', async (c) => {
  return movies.post('/browse/kids', c);
});

movies.post('/browse/kids/movies', async (c) => {
  return movies.post('/browse/kids', c);
});

export default movies;