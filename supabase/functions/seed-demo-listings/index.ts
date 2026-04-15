import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: claimsErr } = await userClient.auth.getUser(token);
  if (claimsErr || !user?.id) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: roleData } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (!roleData || roleData.length === 0) {
    return new Response(JSON.stringify({ error: "Admin role required" }), {
      status: 403,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const AGENT_ID = "53fd551f-a2de-4dbe-ab25-7045bf641e55";
  const IMG = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800";
  const common = {
    agent_id: AGENT_ID,
    is_active: true,
    translation_status: "pending",
    country: "Australia",
    status: "active",
    listing_status: "active",
    image_url: IMG,
  };

  const saleListings = [
    // Melbourne CBD & Inner
    { title: "Modern 2 Bedroom Apartment in Melbourne CBD", address: "88 Flinders Lane", suburb: "Melbourne", state: "VIC", postcode: "3000", price: 680000, beds: 2, baths: 2, parking: 1, property_type: "apartment", lat: -37.8136, lng: 144.9631, description: "Stylish two-bedroom apartment on iconic Flinders Lane with sweeping city views. Open-plan living with stone kitchen and quality appliances flows to a private balcony. Walking distance to Federation Square, the Yarra River, and Melbourne's vibrant laneway dining scene." },
    { title: "Contemporary 1 Bedroom Apartment in Southbank", address: "9 Power Street", suburb: "Southbank", state: "VIC", postcode: "3006", price: 520000, beds: 1, baths: 1, parking: 1, property_type: "apartment", lat: -37.8224, lng: 144.9611, description: "Sleek one-bedroom apartment in Southbank's premier arts precinct with floor-to-ceiling windows. Generous living area with engineered timber floors and stone kitchen. Steps from the Arts Centre, NGV, and Crown Entertainment Complex with secure parking included." },
    { title: "Luxurious 3 Bedroom Penthouse in Docklands", address: "101 Harbour Esplanade", suburb: "Docklands", state: "VIC", postcode: "3008", price: 1650000, beds: 3, baths: 2, parking: 2, property_type: "apartment", lat: -37.8152, lng: 144.9478, description: "Breathtaking three-bedroom penthouse with panoramic harbour and city views from a wraparound terrace. Premium finishes including Miele appliances, engineered oak floors, and floor-to-ceiling glass. Resort amenities include infinity pool, gym, sauna, and 24-hour concierge." },
    { title: "Compact Studio in Melbourne CBD", address: "22 Little Collins Street", suburb: "Melbourne", state: "VIC", postcode: "3000", price: 395000, beds: 1, baths: 1, parking: 0, property_type: "apartment", lat: -37.8142, lng: 144.9668, description: "Efficient studio apartment perfect for investors or city professionals in the heart of the CBD. Clever layout maximises every square metre with built-in storage and a study nook. Trams at the doorstep with Queen Victoria Market and Emporium Melbourne moments away." },
    // South Yarra
    { title: "Grand 4 Bedroom Family Home in South Yarra", address: "18 Domain Road", suburb: "South Yarra", state: "VIC", postcode: "3141", price: 3200000, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -37.8393, lng: 144.9916, description: "Stately four-bedroom residence opposite the Royal Botanic Gardens with manicured grounds. High ceilings, marble fireplaces, and herringbone parquetry floors define the period character. Chef's kitchen with butler's pantry opens to an entertainer's courtyard with heated pool." },
    { title: "Modern 3 Bedroom Townhouse in South Yarra", address: "45 Punt Road", suburb: "South Yarra", state: "VIC", postcode: "3141", price: 1450000, beds: 3, baths: 2, parking: 2, property_type: "townhouse", lat: -37.8398, lng: 144.9932, description: "Architecturally designed three-bedroom townhouse across three levels with rooftop terrace and city views. Open-plan living with polished concrete floors flows to a landscaped courtyard. Walking distance to Chapel Street boutiques and South Yarra station." },
    // Toorak
    { title: "Prestigious 5 Bedroom Estate in Toorak", address: "42 St Georges Road", suburb: "Toorak", state: "VIC", postcode: "3142", price: 5800000, beds: 5, baths: 4, parking: 4, property_type: "house", lat: -37.8447, lng: 145.0150, description: "Magnificent five-bedroom estate on a tree-lined boulevard in Melbourne's most prestigious suburb. Grand proportions with formal and informal living, home cinema, wine cellar, and north-facing pool with tennis court. Impeccable gardens with automated irrigation throughout." },
    { title: "Elegant 4 Bedroom Home in Toorak", address: "7 Orrong Road", suburb: "Toorak", state: "VIC", postcode: "3142", price: 4200000, beds: 4, baths: 3, parking: 3, property_type: "house", lat: -37.8441, lng: 145.0127, description: "Beautifully renovated four-bedroom Toorak residence blending period charm with contemporary luxury. Original leadlight windows and ornate ceilings complement a stunning modern extension. Heated swimming pool, established gardens, and a home office with separate entrance." },
    { title: "Sophisticated 3 Bedroom Apartment in Toorak", address: "888 Toorak Road", suburb: "Toorak", state: "VIC", postcode: "3142", price: 1850000, beds: 3, baths: 2, parking: 2, property_type: "apartment", lat: -37.8448, lng: 145.0154, description: "Premium three-bedroom apartment in a boutique development of only six residences. Spacious interiors with stone island kitchen, Sub-Zero fridge, and north-facing living. Landscaped communal gardens and secure basement parking in the heart of Toorak Village." },
    // Richmond
    { title: "Charming 3 Bedroom Victorian Terrace in Richmond", address: "22 Church Street", suburb: "Richmond", state: "VIC", postcode: "3121", price: 1380000, beds: 3, baths: 2, parking: 1, property_type: "house", lat: -37.8261, lng: 144.9993, description: "Beautifully restored three-bedroom Victorian terrace with original façade, iron lacework, and tessellated tile porch. Modern rear extension features a skylit open-plan kitchen and living area. Rear garden with lane access, moments from Bridge Road shops and the MCG." },
    { title: "Spacious 4 Bedroom Edwardian in Richmond", address: "8 Highett Street", suburb: "Richmond", state: "VIC", postcode: "3121", price: 1680000, beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.8249, lng: 145.0014, description: "Substantial four-bedroom Edwardian home on a wide tree-lined street in Richmond's golden mile. Period features include pressed metal ceilings, picture rails, and central hallway. Vast rear yard with mature citrus trees and potential for extension or pool (STCA)." },
    { title: "Contemporary 3 Bedroom Townhouse in Richmond", address: "15 Lennox Street", suburb: "Richmond", state: "VIC", postcode: "3121", price: 985000, beds: 3, baths: 2, parking: 1, property_type: "townhouse", lat: -37.8255, lng: 144.9982, description: "Stylish three-bedroom townhouse in a boutique complex near Swan Street. Split-level design with ground-floor living opening to a courtyard garden. Rooftop terrace with city skyline views, walk to Richmond station and the famous Vietnamese restaurants." },
    // Fitzroy & Collingwood
    { title: "Converted 3 Bedroom Warehouse in Fitzroy", address: "88 Smith Street", suburb: "Fitzroy", state: "VIC", postcode: "3065", price: 1750000, beds: 3, baths: 2, parking: 2, property_type: "house", lat: -37.7994, lng: 144.9773, description: "Stunning warehouse conversion in the heart of Fitzroy's arts precinct with soaring 5-metre ceilings. Exposed brick walls and polished concrete floors create dramatic living spaces. Mezzanine master suite with ensuite, north-facing courtyard with mature olive trees." },
    { title: "Classic 3 Bedroom Terrace in Fitzroy", address: "14 Gore Street", suburb: "Fitzroy", state: "VIC", postcode: "3065", price: 1190000, beds: 3, baths: 1, parking: 0, property_type: "house", lat: -37.7999, lng: 144.9793, description: "Authentic three-bedroom Victorian terrace on one of Fitzroy's most desirable streets. Original timber floors, marble fireplaces, and decorative cornices throughout. Galley kitchen leads to a sunny rear courtyard, steps from Brunswick Street bars and galleries." },
    { title: "Architect-Designed 4 Bedroom Home in Collingwood", address: "32 Johnston Street", suburb: "Collingwood", state: "VIC", postcode: "3066", price: 1620000, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -37.8012, lng: 144.9823, description: "Award-winning architect-designed four-bedroom home with dramatic double-height void and walls of glass. Sustainable design includes solar panels, rainwater harvesting, and cross-ventilation. Rooftop garden with city views and ground-floor studio with separate access." },
    // St Kilda & Brighton
    { title: "Art Deco 2 Bedroom Apartment in St Kilda", address: "22 Fitzroy Street", suburb: "St Kilda", state: "VIC", postcode: "3182", price: 875000, beds: 2, baths: 2, parking: 1, property_type: "apartment", lat: -37.8677, lng: 144.9802, description: "Charming Art Deco two-bedroom apartment with original leadlight windows and decorative ceiling roses. Spacious living room with picture rails and a sunlit balcony overlooking elm trees. Walk to St Kilda Beach, Luna Park, and the bustling Acland Street café strip." },
    { title: "Stunning 5 Bedroom Beachside Home in Brighton", address: "15 Male Street", suburb: "Brighton", state: "VIC", postcode: "3186", price: 3800000, beds: 5, baths: 4, parking: 3, property_type: "house", lat: -37.9016, lng: 145.0039, description: "Exceptional five-bedroom beachside residence with unobstructed Port Phillip Bay views. Contemporary design with floor-to-ceiling glass, heated infinity pool, and landscaped gardens. Gourmet kitchen with Gaggenau appliances, cellar door, and smart home automation throughout." },
    { title: "Contemporary 4 Bedroom Home in Brighton East", address: "22 Were Street", suburb: "Brighton East", state: "VIC", postcode: "3187", price: 2100000, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -37.9078, lng: 145.0126, description: "Sleek four-bedroom contemporary home in Brighton's café precinct with Italian stone kitchen and butler's pantry. Open-plan living flows to an entertainer's deck with heated pool. Walking distance to Church Street boutiques, Brighton Grammar, and the beach." },
    // Hawthorn & Camberwell
    { title: "Grand 5 Bedroom Family Home in Hawthorn", address: "8 Pakington Street", suburb: "Hawthorn", state: "VIC", postcode: "3122", price: 3400000, beds: 5, baths: 3, parking: 3, property_type: "house", lat: -37.8234, lng: 145.0324, description: "Magnificent five-bedroom period residence in Hawthorn's heritage precinct with ornate plasterwork and bay windows. Grand staircase, fully renovated kitchen, home theatre, and wine cellar. North-facing garden with heated pool and established hedging." },
    { title: "Modern 2 Bedroom Apartment in Camberwell", address: "5 Burke Road", suburb: "Camberwell", state: "VIC", postcode: "3124", price: 680000, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8442, lng: 145.0594, description: "Well-appointed two-bedroom apartment above Camberwell Junction's thriving café strip. Stone kitchen with quality appliances, generous balcony, and split-system climate control. Secure parking and storage cage, steps from trams and Camberwell Market." },
    // Kew, Doncaster, Glen Waverley, Moonee Ponds
    { title: "Beautiful 4 Bedroom Period Home in Kew", address: "42 Sackville Street", suburb: "Kew", state: "VIC", postcode: "3101", price: 2750000, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -37.8042, lng: 145.0282, description: "Gracious four-bedroom Edwardian home on a wide leafy block in Kew's prestigious education belt. Period details include tessellated tile verandah, ornate ceilings, and timber-panelled study. Landscaped rear garden with heritage fruit trees and a studio pavilion." },
    { title: "Impressive 4 Bedroom Entertainer in Doncaster", address: "28 Reynolds Road", suburb: "Doncaster", state: "VIC", postcode: "3108", price: 1420000, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -37.7854, lng: 145.1211, description: "Expansive four-bedroom family home designed for entertaining on a generous 750sqm block. Open-plan living with raked ceilings and bi-fold doors to a covered alfresco with outdoor kitchen. Solar-heated pool, low-maintenance gardens, close to Westfield Doncaster." },
    { title: "Brand New 5 Bedroom Home in Glen Waverley", address: "8 Springvale Road", suburb: "Glen Waverley", state: "VIC", postcode: "3150", price: 1680000, beds: 5, baths: 4, parking: 2, property_type: "house", lat: -37.8790, lng: 145.1628, description: "Brand new five-bedroom residence in the sought-after Glen Waverley Secondary College zone. Premium finishes including 40mm stone benchtops, wide-plank oak floors, and smart home wiring. Ground-floor master with walk-in robe and luxury ensuite, landscaped garden with covered BBQ area." },
    { title: "Charming 3 Bedroom Bungalow in Moonee Ponds", address: "22 Homer Street", suburb: "Moonee Ponds", state: "VIC", postcode: "3039", price: 1250000, beds: 3, baths: 2, parking: 2, property_type: "house", lat: -37.7651, lng: 144.9285, description: "Delightful three-bedroom California bungalow on a quiet tree-lined street in Moonee Ponds. Retain the original charm with leadlight windows, picture rails, and hardwood floors. Large rear yard, walking distance to Moonee Ponds Central and the Maribyrnong River trail." },
    // Sydney
    { title: "Stylish 3 Bedroom Terrace in Surry Hills", address: "44 Crown Street", suburb: "Surry Hills", state: "NSW", postcode: "2010", price: 1850000, beds: 3, baths: 2, parking: 1, property_type: "house", lat: -33.8834, lng: 151.2089, description: "Beautifully renovated three-bedroom terrace in the heart of Surry Hills' vibrant dining scene. Industrial-chic aesthetic with exposed brick, polished concrete, and Caesarstone kitchen. Sunny rear courtyard with lush vertical garden, walk to Central Station and Oxford Street." },
    { title: "Renovated 3 Bedroom Terrace in Newtown", address: "88 King Street", suburb: "Newtown", state: "NSW", postcode: "2042", price: 1420000, beds: 3, baths: 1, parking: 0, property_type: "house", lat: -33.8984, lng: 151.1791, description: "Character-filled three-bedroom terrace on Newtown's iconic King Street strip. Original Victorian façade with a contemporary rear extension featuring skylight and bi-fold doors. Compact courtyard with raised veggie beds, steps from Newtown station and eclectic eateries." },
    { title: "Double-Fronted 4 Bedroom Home in Paddington", address: "12 Oxford Street", suburb: "Paddington", state: "NSW", postcode: "2021", price: 2650000, beds: 4, baths: 2, parking: 1, property_type: "house", lat: -33.8848, lng: 151.2231, description: "Rare double-fronted four-bedroom residence in a premier Paddington street with soaring ceilings and ornate ironwork. Modern kitchen with marble island, separate studio, and sundrenched rear garden. Minutes from Woollahra galleries and Five Ways." },
    { title: "Ocean View 2 Bedroom Apartment in Bondi Beach", address: "180 Campbell Parade", suburb: "Bondi Beach", state: "NSW", postcode: "2026", price: 2200000, beds: 2, baths: 2, parking: 1, property_type: "apartment", lat: -33.8914, lng: 151.2767, description: "Prized north-facing two-bedroom apartment with panoramic ocean views from Bondi to Ben Buckler. Open-plan living with floor-to-ceiling glass sliding doors to a wide entertaining balcony. Secure parking, footsteps from Bondi Icebergs and the famous coastal walk." },
    { title: "Waterfront 4 Bedroom Home in Mosman", address: "14 Avenue Road", suburb: "Mosman", state: "NSW", postcode: "2088", price: 4800000, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -33.8268, lng: 151.2390, description: "Magnificent four-bedroom waterfront home with private jetty and deep-water mooring on Sydney Harbour. Multi-level design captures harbour bridge and opera house views from every floor. Resort-style pool terrace, boathouse, and award-winning landscaped gardens." },
    { title: "Luxury 3 Bedroom Apartment in Chatswood", address: "8 Victor Street", suburb: "Chatswood", state: "NSW", postcode: "2067", price: 1450000, beds: 3, baths: 2, parking: 2, property_type: "apartment", lat: -33.7979, lng: 151.1827, description: "Premium three-bedroom apartment in a landmark Chatswood tower with north-facing city views. Stone kitchen with Bosch appliances, spacious bedrooms with built-in robes. Building amenities include pool, gym, and 24-hour concierge above Chatswood Interchange." },
    { title: "Ocean View 3 Bedroom Apartment in Manly", address: "22 The Corso", suburb: "Manly", state: "NSW", postcode: "2095", price: 2200000, beds: 3, baths: 2, parking: 2, property_type: "apartment", lat: -33.7969, lng: 151.2854, description: "Sun-drenched three-bedroom apartment with sweeping ocean views from a generous wraparound balcony. Open-plan living with coastal-inspired finishes and Smeg kitchen. Direct beach access, Manly Corso dining, and ferry to the city in 30 minutes." },
    // Queensland
    { title: "Classic 4 Bedroom Queenslander in New Farm", address: "22 Brunswick Street", suburb: "New Farm", state: "QLD", postcode: "4005", price: 2100000, beds: 4, baths: 2, parking: 2, property_type: "house", lat: -27.4637, lng: 153.0468, description: "Beautifully restored four-bedroom Queenslander with wraparound verandahs and city skyline views. High ceilings, VJ walls, and polished timber floors throughout. Modern kitchen opens to a covered deck and pool, walk to New Farm Park and James Street." },
    { title: "Industrial-Chic 3 Bedroom Warehouse in Teneriffe", address: "12 Vernon Terrace", suburb: "Teneriffe", state: "QLD", postcode: "4005", price: 1380000, beds: 3, baths: 2, parking: 2, property_type: "apartment", lat: -27.4535, lng: 153.0494, description: "Converted woolstore three-bedroom apartment with soaring ceilings and exposed timber trusses. River glimpses from the entertaining balcony, polished concrete floors, and stone island kitchen. Walk to the Teneriffe ferry terminal and riverside dining precinct." },
    { title: "Riverfront 5 Bedroom Estate in Hamilton", address: "15 Racecourse Road", suburb: "Hamilton", state: "QLD", postcode: "4007", price: 4500000, beds: 5, baths: 4, parking: 4, property_type: "house", lat: -27.4387, lng: 153.0613, description: "Trophy five-bedroom estate with direct Brisbane River frontage and private pontoon. Resort-style grounds with infinity pool, spa, and putting green. Grand proportions with marble foyer, home theatre, wine room, and butler's kitchen." },
    { title: "Beachfront 2 Bedroom Apartment on the Gold Coast", address: "8 The Esplanade", suburb: "Surfers Paradise", state: "QLD", postcode: "4217", price: 1200000, beds: 2, baths: 2, parking: 2, property_type: "apartment", lat: -27.9987, lng: 153.4284, description: "Absolute beachfront two-bedroom apartment with panoramic Pacific Ocean views from a full-width balcony. High-rise tower with resort pool, gym, and on-site management. Modern fitout with stone kitchen, walk to Cavill Avenue shops and nightlife." },
    { title: "Hinterland Retreat 4 Bedroom in Noosa Heads", address: "8 Noosa Drive", suburb: "Noosa Heads", state: "QLD", postcode: "4567", price: 2800000, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -26.3921, lng: 153.0989, description: "Private four-bedroom hinterland retreat set among tropical gardens with Noosa River and national park vistas. Open-plan pavilion design maximises cross-ventilation and natural light. Infinity pool overlooking the valley, minutes to Hastings Street and Main Beach." },
    // Other states
    { title: "Beachside 4 Bedroom Home in Cottesloe", address: "22 Marine Parade", suburb: "Cottesloe", state: "WA", postcode: "6011", price: 4200000, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -31.9981, lng: 115.7526, description: "Stunning four-bedroom beachside residence with uninterrupted Indian Ocean views. Contemporary design with limestone and timber accents, infinity pool, and rooftop terrace. Walk across to Cottesloe Beach and the famous sunset sessions at the Indiana teahouse." },
    { title: "Federation Bungalow 3 Bedroom in Subiaco", address: "8 Rokeby Road", suburb: "Subiaco", state: "WA", postcode: "6008", price: 1650000, beds: 3, baths: 2, parking: 2, property_type: "house", lat: -31.9469, lng: 115.8267, description: "Charming three-bedroom Federation bungalow with original leadlight windows, pressed tin ceilings, and wide jarrah floorboards. Tasteful modern extension with gourmet kitchen and alfresco dining. Established gardens, walk to Subiaco Oval and the train station." },
    { title: "Character 4 Bedroom Home in Unley", address: "22 Unley Road", suburb: "Unley", state: "SA", postcode: "5061", price: 1250000, beds: 4, baths: 2, parking: 2, property_type: "house", lat: -34.9524, lng: 138.5982, description: "Elegant four-bedroom bluestone villa in the heart of Unley's café and boutique precinct. Original features include ornate fireplaces, ceiling roses, and wide central hallway. Rear extension with open-plan living and a private garden with mature hedging." },
    { title: "Family 4 Bedroom Home in Sandy Bay", address: "22 Sandy Bay Road", suburb: "Sandy Bay", state: "TAS", postcode: "7005", price: 1200000, beds: 4, baths: 2, parking: 2, property_type: "house", lat: -42.8931, lng: 147.3306, description: "Spacious four-bedroom family home with Derwent River views in prestigious Sandy Bay. Well-maintained gardens, separate living and dining rooms, and a modern kitchen. Close to the University of Tasmania, Sandy Bay village, and Long Beach." },
    { title: "Tropical 4 Bedroom Home in Darwin", address: "22 The Esplanade", suburb: "Darwin", state: "NT", postcode: "0800", price: 780000, beds: 4, baths: 2, parking: 3, property_type: "house", lat: -12.4634, lng: 130.8456, description: "Elevated four-bedroom tropical home near the Darwin foreshore and Bicentennial Park. Open-plan design with louvred windows for year-round cross-ventilation. Covered entertaining deck overlooking a saltwater pool, close to the Waterfront Precinct." },
    { title: "Modern 2 Bedroom Apartment in Braddon", address: "8 Lonsdale Street", suburb: "Braddon", state: "ACT", postcode: "2612", price: 680000, beds: 2, baths: 2, parking: 1, property_type: "apartment", lat: -35.2742, lng: 149.1369, description: "Contemporary two-bedroom apartment in Braddon's thriving food and bar precinct. North-facing balcony, stone kitchen with integrated appliances, and generous built-in storage. Secure parking, walk to the Light Rail, ANU campus, and Civic." },
    { title: "Hinterland 5 Bedroom Home in Byron Bay", address: "22 Bangalow Road", suburb: "Byron Bay", state: "NSW", postcode: "2481", price: 2800000, beds: 5, baths: 3, parking: 4, property_type: "house", lat: -28.6474, lng: 153.5993, description: "Sprawling five-bedroom hinterland property on 2 acres with panoramic views to Cape Byron lighthouse. Pavilion-style design with multiple living zones, chef's kitchen, and infinity pool. Separate guest cottage, organic orchard, and rainforest gully." },
    { title: "City Terrace 3 Bedroom in Geelong", address: "22 Moorabool Street", suburb: "Geelong", state: "VIC", postcode: "3220", price: 780000, beds: 3, baths: 2, parking: 1, property_type: "house", lat: -38.1491, lng: 144.3603, description: "Renovated three-bedroom Victorian terrace in the heart of Geelong's cultural precinct. Original façade with contemporary interiors, polished timber floors, and open-plan kitchen. Walk to the Geelong waterfront and the train station to Melbourne." },
    { title: "Victorian 4 Bedroom Home in Ballarat", address: "22 Sturt Street", suburb: "Ballarat Central", state: "VIC", postcode: "3350", price: 580000, beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.5622, lng: 143.8503, description: "Impressive four-bedroom Victorian home on Ballarat's grand Sturt Street with original bluestone façade and iron lacework. High ceilings, marble fireplaces, and period detailing throughout. Large rear garden, walk to the Art Gallery and Sturt Street gardens." },
  ];

  const rentalListings = [
    { title: "Stylish 2 Bedroom Apartment for Rent in South Yarra", address: "88 Toorak Road", suburb: "South Yarra", state: "VIC", postcode: "3141", rental_weekly: 680, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8393, lng: 144.9928, description: "Modern two-bedroom apartment on Toorak Road with city views from a private balcony. Open-plan living with timber floors and stone kitchen. Building includes pool and gym, walk to Chapel Street and South Yarra station." },
    { title: "Character 3 Bedroom Terrace for Rent in Fitzroy", address: "22 Brunswick Street", suburb: "Fitzroy", state: "VIC", postcode: "3065", rental_weekly: 780, beds: 3, baths: 2, parking: 1, property_type: "house", lat: -37.7994, lng: 144.9773, description: "Charming three-bedroom terrace in the heart of Fitzroy with exposed brick, timber floors, and a sunny rear courtyard. Gas cooking, split-system air conditioning, and ceiling fans. Walk to bars, galleries, and Edinburgh Gardens." },
    { title: "Cosy 1 Bedroom Apartment for Rent in Richmond", address: "44 Church Street", suburb: "Richmond", state: "VIC", postcode: "3121", rental_weekly: 450, beds: 1, baths: 1, parking: 0, property_type: "apartment", lat: -37.8255, lng: 144.9982, description: "Well-maintained one-bedroom apartment on Richmond's bustling Church Street. Timber floors, updated kitchen, and spacious living area. Walk to Richmond station, the MCG, and Melbourne's best Vietnamese restaurants." },
    { title: "Studio for Rent in St Kilda", address: "16 Acland Street", suburb: "St Kilda", state: "VIC", postcode: "3182", rental_weekly: 390, beds: 0, baths: 1, parking: 0, property_type: "apartment", lat: -37.8677, lng: 144.9802, description: "Bright studio apartment on St Kilda's famous Acland Street. Kitchenette with gas cooktop, built-in wardrobe, and shared rooftop terrace with bay views. Steps from the beach, Luna Park, and tram routes to the city." },
    { title: "Spacious 4 Bedroom Family Home for Rent in Hawthorn", address: "8 Glenferrie Road", suburb: "Hawthorn", state: "VIC", postcode: "3122", rental_weekly: 1200, beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.8234, lng: 145.0324, description: "Grand four-bedroom family home in Hawthorn with formal and informal living areas, modern kitchen, and private rear garden. Gas ducted heating and evaporative cooling. Close to Scotch College, Swinburne University, and Glenferrie Road shops." },
    { title: "Bright 2 Bedroom Apartment for Rent in Carlton", address: "88 Lygon Street", suburb: "Carlton", state: "VIC", postcode: "3053", rental_weekly: 520, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.7985, lng: 144.9671, description: "Light-filled two-bedroom apartment on Carlton's famous Lygon Street with balcony overlooking tree-lined streetscape. Updated kitchen and bathroom, walk to the University of Melbourne, RMIT, and Carlton Gardens." },
    { title: "Renovated 3 Bedroom Terrace for Rent in Prahran", address: "44 Greville Street", suburb: "Prahran", state: "VIC", postcode: "3181", rental_weekly: 850, beds: 3, baths: 2, parking: 1, property_type: "house", lat: -37.8498, lng: 144.9923, description: "Fully renovated three-bedroom terrace in Prahran with gourmet kitchen, European laundry, and north-facing courtyard. Polished concrete floors and plantation shutters throughout. Walk to Prahran Market, Chapel Street, and Windsor station." },
    { title: "Warehouse-Style Apartment for Rent in Collingwood", address: "22 Smith Street", suburb: "Collingwood", state: "VIC", postcode: "3066", rental_weekly: 580, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8012, lng: 144.9823, description: "Unique warehouse-style apartment with soaring ceilings, exposed brick, and industrial aesthetic. Open-plan kitchen and living with secure car space. Walk to Smith Street dining, Collingwood Yards, and easy tram access to the CBD." },
    { title: "Terrace 2 Bedroom for Rent in Surry Hills", address: "15 Foveaux Street", suburb: "Surry Hills", state: "NSW", postcode: "2010", rental_weekly: 850, beds: 2, baths: 1, parking: 0, property_type: "house", lat: -33.8834, lng: 151.2089, description: "Stylish two-bedroom terrace in Surry Hills with sun-drenched courtyard and modern finishes. Timber floors, stone kitchen, and air conditioning. Walk to Central Station, Crown Street dining, and Sydney's best coffee roasters." },
    { title: "Spacious 3 Bedroom House for Rent in Newtown", address: "42 Enmore Road", suburb: "Newtown", state: "NSW", postcode: "2042", rental_weekly: 1050, beds: 3, baths: 2, parking: 1, property_type: "house", lat: -33.8984, lng: 151.1791, description: "Generous three-bedroom house on a quiet Newtown street with rear garden and off-street parking. Open-plan kitchen and living with air conditioning. Walk to King Street cafés, Newtown station, and Camperdown Park." },
    { title: "Modern 1 Bedroom Apartment for Rent in Bondi Junction", address: "14 Spring Street", suburb: "Bondi Junction", state: "NSW", postcode: "2022", rental_weekly: 650, beds: 1, baths: 1, parking: 1, property_type: "apartment", lat: -33.8920, lng: 151.2497, description: "Modern one-bedroom apartment in Bondi Junction with secure parking and building gym. North-facing balcony, stone kitchen, and built-in robes. Direct train access to the city and Bondi Beach bus routes nearby." },
    { title: "Bright 2 Bedroom Apartment for Rent in Chatswood", address: "22 Albert Avenue", suburb: "Chatswood", state: "NSW", postcode: "2067", rental_weekly: 750, beds: 2, baths: 2, parking: 1, property_type: "apartment", lat: -33.7979, lng: 151.1827, description: "Spacious two-bedroom apartment in Chatswood CBD with district views. Modern kitchen, air conditioning, and internal laundry. Building has pool, gym, and concierge, steps from Chatswood station and Westfield." },
    { title: "Riverside 2 Bedroom Apartment for Rent in New Farm", address: "44 Merthyr Road", suburb: "New Farm", state: "QLD", postcode: "4005", rental_weekly: 620, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -27.4637, lng: 153.0468, description: "Charming two-bedroom apartment in a leafy New Farm street with polished timber floors and air conditioning. Private courtyard with mature plantings. Walk to New Farm Park, the Powerhouse, and James Street dining precinct." },
    { title: "Queenslander 3 Bedroom for Rent in West End", address: "22 Hardgrave Road", suburb: "West End", state: "QLD", postcode: "4101", rental_weekly: 780, beds: 3, baths: 2, parking: 2, property_type: "house", lat: -27.4845, lng: 153.0135, description: "Classic three-bedroom Queenslander with wide verandahs, high ceilings, and VJ walls. Fenced backyard, air conditioning, and ceiling fans throughout. Walk to the West End Markets, Davies Park, and South Bank Parklands." },
    { title: "Family 3 Bedroom Home for Rent in Doncaster", address: "8 Doncaster Road", suburb: "Doncaster", state: "VIC", postcode: "3108", rental_weekly: 650, beds: 3, baths: 2, parking: 2, property_type: "house", lat: -37.7854, lng: 145.1211, description: "Well-presented three-bedroom family home with open-plan living, gas ducted heating, and evaporative cooling. Double garage and private rear garden. Close to Westfield Doncaster, city bus routes, and local parks." },
    { title: "Executive 4 Bedroom Home for Rent in Glen Waverley", address: "12 Springvale Road", suburb: "Glen Waverley", state: "VIC", postcode: "3150", rental_weekly: 1100, beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.8790, lng: 145.1628, description: "Impressive four-bedroom executive home in the Glen Waverley Secondary College zone. Multiple living zones, stone kitchen, and covered alfresco with BBQ. Air conditioning, alarm system, and double lock-up garage." },
    { title: "Convenient 2 Bedroom Apartment for Rent in Box Hill", address: "22 Whitehorse Road", suburb: "Box Hill", state: "VIC", postcode: "3128", rental_weekly: 520, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8185, lng: 145.1196, description: "Modern two-bedroom apartment near Box Hill Hospital and Box Hill Central shopping centre. Air conditioning, secure parking, and building intercom. Walk to Box Hill station and the vibrant Asian dining precinct." },
    { title: "Modern 2 Bedroom Apartment for Rent in South Melbourne", address: "44 Clarendon Street", suburb: "South Melbourne", state: "VIC", postcode: "3205", rental_weekly: 700, beds: 2, baths: 2, parking: 1, property_type: "apartment", lat: -37.8312, lng: 144.9558, description: "Sleek two-bedroom apartment with city views from a wide north-facing balcony. Stone kitchen, split-system air conditioning, and secure basement parking. Walk to South Melbourne Market, the Arts Precinct, and Albert Park Lake." },
    { title: "Affordable 2 Bedroom Apartment for Rent in Footscray", address: "22 Nicholson Street", suburb: "Footscray", state: "VIC", postcode: "3011", rental_weekly: 480, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8007, lng: 144.8992, description: "Well-located two-bedroom apartment in Footscray with easy access to the city via train. Open-plan living with split-system heating and cooling. Secure entry and car space, close to Victoria University and Footscray Market." },
    { title: "Bayside 3 Bedroom Home for Rent in Williamstown", address: "22 Nelson Place", suburb: "Williamstown", state: "VIC", postcode: "3016", rental_weekly: 750, beds: 3, baths: 2, parking: 2, property_type: "house", lat: -37.8668, lng: 144.8997, description: "Charming three-bedroom home in Williamstown's village precinct with polished timber floors and updated kitchen. Sunny rear garden, walk to Williamstown Beach and Nelson Place restaurants. Gas heating and air conditioning included." },
  ];

  const formatPrice = (p: number) => `$${p.toLocaleString("en-AU")}`;

  const saleRows = saleListings.map((l, i) => ({
    ...common,
    ...l,
    listing_type: "sale",
    listing_category: "sale",
    is_featured: i < 20,
    price_formatted: formatPrice(l.price),
  }));

  const rentalRows = rentalListings.map((l) => ({
    ...common,
    ...l,
    listing_type: "rent",
    listing_category: "rent",
    price: 0,
    price_formatted: `$${l.rental_weekly}/wk`,
    is_featured: false,
  }));

  try {
    const { data: saleData, error: saleError } = await adminClient
      .from("properties")
      .insert(saleRows)
      .select("id");

    if (saleError) {
      return new Response(
        JSON.stringify({ error: `Sale insert failed: ${saleError.message}` }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const { data: rentalData, error: rentalError } = await adminClient
      .from("properties")
      .insert(rentalRows)
      .select("id");

    if (rentalError) {
      return new Response(
        JSON.stringify({ error: `Rental insert failed: ${rentalError.message}` }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const saleCount = saleData?.length || 0;
    const rentalCount = rentalData?.length || 0;

    return new Response(
      JSON.stringify({
        success: true,
        sale_count: saleCount,
        rental_count: rentalCount,
        total: saleCount + rentalCount,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
