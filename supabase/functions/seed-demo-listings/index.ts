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

  // Auth check
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

  // Verify caller is admin
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Check admin role
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
  const common = {
    agent_id: AGENT_ID,
    is_active: true,
    translation_status: "pending",
    country: "Australia",
    status: "active",
  };

  const saleListings = [
    // Melbourne CBD
    { title: "Stylish 2 Bedroom Apartment in Melbourne CBD", address: "120 Spencer Street", suburb: "Melbourne", state: "VIC", postcode: "3000", price: 680000, price_formatted: "$680,000", beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8136, lng: 144.9631, description: "Modern two-bedroom apartment in the heart of Melbourne CBD with sweeping city views. Open-plan living and dining area flows onto a private balcony. Walking distance to Southern Cross Station, Docklands, and the vibrant restaurant scene along the Yarra River." },
    { title: "Contemporary 1 Bedroom Apartment in Southbank", address: "88 Southbank Boulevard", suburb: "Southbank", state: "VIC", postcode: "3006", price: 520000, price_formatted: "$520,000", beds: 1, baths: 1, parking: 1, property_type: "apartment", lat: -37.8225, lng: 144.9644, description: "Sleek one-bedroom apartment in Southbank's premier arts precinct. Floor-to-ceiling windows flood the living space with natural light. Steps from the Arts Centre, NGV, and Crown Entertainment Complex. Includes secure parking and building gym access." },
    { title: "Luxurious 3 Bedroom Penthouse in Docklands", address: "22 NewQuay Promenade", suburb: "Docklands", state: "VIC", postcode: "3008", price: 1650000, price_formatted: "$1,650,000", beds: 3, baths: 2, parking: 2, property_type: "penthouse", lat: -37.8155, lng: 144.9460, description: "Breathtaking three-bedroom penthouse with panoramic harbour and city views from a wraparound terrace. Premium finishes throughout including stone benchtops, integrated Miele appliances, and engineered timber floors. Resort-style amenities include rooftop pool, gym, and concierge." },
    { title: "Compact Studio Apartment in Melbourne CBD", address: "350 William Street", suburb: "Melbourne", state: "VIC", postcode: "3000", price: 395000, price_formatted: "$395,000", beds: 0, baths: 1, parking: 0, property_type: "studio", lat: -37.8112, lng: 144.9554, description: "Efficient studio apartment perfect for investors or city professionals. Clever layout maximises every square metre with built-in storage and a study nook. Located in the legal precinct with trams at the doorstep and Queen Victoria Market moments away." },
    // South Yarra
    { title: "Grand 4 Bedroom Family Home in South Yarra", address: "15 Domain Road", suburb: "South Yarra", state: "VIC", postcode: "3141", price: 3200000, price_formatted: "$3,200,000", beds: 4, baths: 3, parking: 2, property_type: "house", lat: -37.8380, lng: 144.9780, description: "Stately four-bedroom residence set in manicured gardens opposite the Royal Botanic Gardens. High ceilings, marble fireplaces, and herringbone parquetry floors define the period character. Chef's kitchen with butler's pantry opens to an entertainer's courtyard with heated pool." },
    { title: "Modern 3 Bedroom Townhouse in South Yarra", address: "42 Claremont Street", suburb: "South Yarra", state: "VIC", postcode: "3141", price: 1450000, price_formatted: "$1,450,000", beds: 3, baths: 2, parking: 1, property_type: "townhouse", lat: -37.8395, lng: 144.9810, description: "Architecturally designed three-bedroom townhouse across three levels with rooftop terrace and city views. Open-plan living with polished concrete floors flows to a landscaped courtyard. Walking distance to Chapel Street, Toorak Road cafés, and the South Yarra train station." },
    // Toorak
    { title: "Prestigious 5 Bedroom Estate in Toorak", address: "8 St Georges Road", suburb: "Toorak", state: "VIC", postcode: "3142", price: 5800000, price_formatted: "$5,800,000", beds: 5, baths: 4, parking: 3, property_type: "house", lat: -37.8410, lng: 144.9920, description: "Magnificent five-bedroom estate on a tree-lined boulevard in Melbourne's most prestigious suburb. Grand proportions with formal and informal living zones, home cinema, wine cellar, and a north-facing pool and tennis court. Impeccable gardens with automated irrigation throughout." },
    { title: "Elegant 4 Bedroom Home in Toorak", address: "28 Irving Road", suburb: "Toorak", state: "VIC", postcode: "3142", price: 4200000, price_formatted: "$4,200,000", beds: 4, baths: 3, parking: 2, property_type: "house", lat: -37.8430, lng: 144.9890, description: "Beautifully renovated four-bedroom Toorak residence blending period charm with contemporary luxury. Original leadlight windows and ornate ceilings complement a stunning modern extension. Heated swimming pool, established gardens, and a home office with separate entrance." },
    { title: "Sophisticated 3 Bedroom Apartment in Toorak", address: "55 Mathoura Road", suburb: "Toorak", state: "VIC", postcode: "3142", price: 1850000, price_formatted: "$1,850,000", beds: 3, baths: 2, parking: 2, property_type: "apartment", lat: -37.8445, lng: 144.9935, description: "Premium three-bedroom apartment in a boutique development of only six residences. Spacious interiors with stone island kitchen, integrated Sub-Zero fridge, and north-facing living areas. Landscaped communal gardens and secure basement parking in the heart of Toorak Village." },
    // Richmond
    { title: "Charming 3 Bedroom Victorian Terrace in Richmond", address: "78 Church Street", suburb: "Richmond", state: "VIC", postcode: "3121", price: 1380000, price_formatted: "$1,380,000", beds: 3, baths: 2, parking: 1, property_type: "terrace", lat: -37.8180, lng: 144.9980, description: "Beautifully restored three-bedroom Victorian terrace with original façade, iron lacework, and tessellated tile porch. The modern rear extension features a skylit open-plan kitchen and living area. Rear garden with lane access, moments from Bridge Road shops and the MCG." },
    { title: "Spacious 4 Bedroom Edwardian in Richmond", address: "21 Lennox Street", suburb: "Richmond", state: "VIC", postcode: "3121", price: 1680000, price_formatted: "$1,680,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.8200, lng: 145.0010, description: "Substantial four-bedroom Edwardian home on a wide tree-lined street in Richmond's golden mile. Period features include pressed metal ceilings, picture rails, and a central hallway. Vast rear yard with mature citrus trees and potential for extension or pool (STCA)." },
    { title: "Contemporary 3 Bedroom Townhouse in Richmond", address: "5/100 Swan Street", suburb: "Richmond", state: "VIC", postcode: "3121", price: 985000, price_formatted: "$985,000", beds: 3, baths: 2, parking: 1, property_type: "townhouse", lat: -37.8190, lng: 145.0000, description: "Stylish three-bedroom townhouse in a boutique complex on Richmond's iconic Swan Street. Split-level design with ground-floor living opening to a courtyard garden. Rooftop terrace with city skyline views. Walk to Richmond station, cafés, and the famous Vietnamese restaurants." },
    // Fitzroy
    { title: "Converted 3 Bedroom Warehouse in Fitzroy", address: "210 Gertrude Street", suburb: "Fitzroy", state: "VIC", postcode: "3065", price: 1750000, price_formatted: "$1,750,000", beds: 3, baths: 2, parking: 1, property_type: "warehouse", lat: -37.8060, lng: 144.9780, description: "Stunning warehouse conversion in the heart of Fitzroy's arts precinct. Soaring 5-metre ceilings, exposed brick walls, and polished concrete floors create dramatic living spaces. Mezzanine level houses the master suite with ensuite. North-facing courtyard garden with mature olive trees." },
    { title: "Classic 3 Bedroom Terrace in Fitzroy", address: "45 Napier Street", suburb: "Fitzroy", state: "VIC", postcode: "3065", price: 1190000, price_formatted: "$1,190,000", beds: 3, baths: 1, parking: 0, property_type: "terrace", lat: -37.8040, lng: 144.9770, description: "Authentic three-bedroom Victorian terrace on one of Fitzroy's most desirable streets. Original features throughout including timber floors, marble fireplaces, and decorative cornices. Galley kitchen leads to a sunny rear courtyard. Steps from Brunswick Street bars, galleries, and trams." },
    // Collingwood
    { title: "Architect-Designed 4 Bedroom Home in Collingwood", address: "33 Cambridge Street", suburb: "Collingwood", state: "VIC", postcode: "3066", price: 1620000, price_formatted: "$1,620,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.8010, lng: 144.9870, description: "Award-winning architect-designed four-bedroom home featuring a dramatic double-height void and walls of glass. Sustainable design includes solar panels, rainwater harvesting, and cross-ventilation. Rooftop garden with city views and a ground-floor studio with separate access." },
    // St Kilda
    { title: "Art Deco 2 Bedroom Apartment in St Kilda", address: "12 Fitzroy Street", suburb: "St Kilda", state: "VIC", postcode: "3182", price: 875000, price_formatted: "$875,000", beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8600, lng: 144.9740, description: "Charming Art Deco two-bedroom apartment with original leadlight windows and decorative ceiling roses. Spacious living room with picture rails and a sunlit balcony overlooking mature elm trees. Walk to St Kilda Beach, Luna Park, and the bustling Acland Street café strip." },
    // Brighton
    { title: "Stunning 5 Bedroom Beachside Home in Brighton", address: "3 The Esplanade", suburb: "Brighton", state: "VIC", postcode: "3186", price: 3800000, price_formatted: "$3,800,000", beds: 5, baths: 3, parking: 3, property_type: "house", lat: -37.9200, lng: 144.9870, description: "Exceptional five-bedroom beachside residence with unobstructed Port Phillip Bay views. Contemporary design with floor-to-ceiling glass, heated infinity pool, and landscaped gardens reaching to the sand. Gourmet kitchen with Gaggenau appliances, cellar door, and home automation throughout." },
    { title: "Contemporary 4 Bedroom Home in Brighton", address: "58 Were Street", suburb: "Brighton", state: "VIC", postcode: "3186", price: 2100000, price_formatted: "$2,100,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.9140, lng: 145.0020, description: "Sleek four-bedroom contemporary home in Brighton's café precinct. Open-plan living with Italian stone kitchen and butler's pantry flows to an entertainer's deck and heated pool. Walking distance to Church Street boutiques, Brighton Grammar, and the beach." },
    // Hawthorn
    { title: "Grand 5 Bedroom Family Home in Hawthorn", address: "10 Harcourt Street", suburb: "Hawthorn", state: "VIC", postcode: "3122", price: 3400000, price_formatted: "$3,400,000", beds: 5, baths: 3, parking: 3, property_type: "house", lat: -37.8220, lng: 145.0340, description: "Magnificent five-bedroom period residence set behind a hedge-lined garden in Hawthorn's heritage precinct. Original features include ornate plasterwork, bay windows, and a grand staircase. Fully renovated kitchen, home theatre, wine cellar, and a north-facing garden with heated pool." },
    // Camberwell
    { title: "Modern 2 Bedroom Apartment in Camberwell", address: "15 Burke Road", suburb: "Camberwell", state: "VIC", postcode: "3124", price: 680000, price_formatted: "$680,000", beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8420, lng: 145.0570, description: "Well-appointed two-bedroom apartment above Camberwell Junction's thriving café strip. Stone kitchen with quality appliances, generous balcony, and split-system climate control. Secure basement parking and storage cage. Steps from trams, Camberwell Market, and leafy Riversdale Park." },
    // Kew
    { title: "Beautiful 4 Bedroom Period Home in Kew", address: "22 Cotham Road", suburb: "Kew", state: "VIC", postcode: "3101", price: 2750000, price_formatted: "$2,750,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.8080, lng: 145.0370, description: "Gracious four-bedroom Edwardian home on a wide, leafy block in Kew's prestigious education belt. Period details include tessellated tile verandah, ornate ceilings, and timber-panelled study. Landscaped rear garden with established roses, heritage fruit trees, and a studio pavilion." },
    // Doncaster
    { title: "Impressive 4 Bedroom Entertainer in Doncaster", address: "45 Tram Road", suburb: "Doncaster", state: "VIC", postcode: "3108", price: 1420000, price_formatted: "$1,420,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.7850, lng: 145.1260, description: "Expansive four-bedroom family home designed for entertaining on a generous 750sqm allotment. Open-plan living with raked ceilings and bi-fold doors to a covered alfresco with outdoor kitchen. Solar-heated pool, low-maintenance gardens, and close to Westfield Doncaster and city buses." },
    // Glen Waverley
    { title: "Brand New 5 Bedroom Home in Glen Waverley (GWSC Zone)", address: "18 Kingsway Avenue", suburb: "Glen Waverley", state: "VIC", postcode: "3150", price: 1680000, price_formatted: "$1,680,000", beds: 5, baths: 3, parking: 2, property_type: "house", lat: -37.8770, lng: 145.1650, description: "Brand new five-bedroom residence in the sought-after Glen Waverley Secondary College zone. Premium finishes including 40mm stone benchtops, wide-plank oak floors, and smart home wiring. Ground-floor master with walk-in robe and luxury ensuite. Landscaped garden with covered BBQ area." },
    // Moonee Ponds
    { title: "Charming 3 Bedroom Bungalow in Moonee Ponds", address: "9 Dean Street", suburb: "Moonee Ponds", state: "VIC", postcode: "3039", price: 1250000, price_formatted: "$1,250,000", beds: 3, baths: 1, parking: 1, property_type: "house", lat: -37.7650, lng: 144.9200, description: "Delightful three-bedroom California bungalow on a quiet, tree-lined street in Moonee Ponds. Retain the original charm with leadlight windows, picture rails, and hardwood floors, or extend (STCA). Large rear yard, walking distance to Moonee Ponds Central and the Maribyrnong River trail." },

    // SYDNEY
    { title: "Stylish 3 Bedroom Terrace in Surry Hills", address: "62 Crown Street", suburb: "Surry Hills", state: "NSW", postcode: "2010", price: 1850000, price_formatted: "$1,850,000", beds: 3, baths: 2, parking: 0, property_type: "terrace", lat: -33.8850, lng: 151.2130, description: "Beautifully renovated three-bedroom terrace in the heart of Surry Hills' vibrant dining scene. Industrial-chic aesthetic with exposed brick, polished concrete, and Caesarstone kitchen. Sunny rear courtyard with lush vertical garden. Walk to Central Station and Oxford Street." },
    { title: "Renovated 3 Bedroom Terrace in Newtown", address: "115 King Street", suburb: "Newtown", state: "NSW", postcode: "2042", price: 1420000, price_formatted: "$1,420,000", beds: 3, baths: 1, parking: 0, property_type: "terrace", lat: -33.8970, lng: 151.1790, description: "Character-filled three-bedroom terrace on Newtown's iconic King Street strip. Original Victorian façade with a contemporary rear extension featuring skylight and bi-fold doors. Compact courtyard with raised veggie beds. Steps from Newtown station, live music venues, and eclectic eateries." },
    { title: "Double-Fronted 4 Bedroom Home in Paddington", address: "28 Glenmore Road", suburb: "Paddington", state: "NSW", postcode: "2021", price: 2650000, price_formatted: "$2,650,000", beds: 4, baths: 2, parking: 1, property_type: "house", lat: -33.8850, lng: 151.2270, description: "Rare double-fronted four-bedroom residence in a premier Paddington street. Soaring ceilings, ornate ironwork, and a grand entry hallway set the tone. Modern kitchen with marble island, separate studio, and a sundrenched rear garden. Minutes from Woollahra galleries and Five Ways." },
    { title: "Ocean View 2 Bedroom Apartment in Bondi Beach", address: "5/180 Campbell Parade", suburb: "Bondi Beach", state: "NSW", postcode: "2026", price: 2200000, price_formatted: "$2,200,000", beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -33.8910, lng: 151.2740, description: "Prized north-facing two-bedroom apartment with panoramic ocean views from Bondi to Ben Buckler. Open-plan living with floor-to-ceiling glass sliding doors to a wide entertaining balcony. Secure parking and storage. Footsteps from the famous Bondi Icebergs and coastal walk." },
    { title: "Waterfront 4 Bedroom Home in Mosman", address: "12 Beauty Point Road", suburb: "Mosman", state: "NSW", postcode: "2088", price: 4800000, price_formatted: "$4,800,000", beds: 4, baths: 3, parking: 2, property_type: "house", lat: -33.8290, lng: 151.2440, description: "Magnificent four-bedroom waterfront home with private jetty and deep-water mooring on Sydney Harbour. Multi-level design captures harbour bridge and opera house views from every floor. Resort-style pool terrace, boathouse, and award-winning landscaped gardens. Taronga Zoo ferry wharf nearby." },
    { title: "Luxury 3 Bedroom Apartment in Chatswood", address: "1 Railway Street", suburb: "Chatswood", state: "NSW", postcode: "2067", price: 1450000, price_formatted: "$1,450,000", beds: 3, baths: 2, parking: 2, property_type: "apartment", lat: -33.7960, lng: 151.1830, description: "Premium three-bedroom apartment in a landmark Chatswood tower with north-facing city views. Stone kitchen with Bosch appliances, spacious bedrooms with built-in robes, and two secure car spaces. Building amenities include pool, gym, and 24-hour concierge. Above Chatswood Interchange." },
    { title: "Ocean View 3 Bedroom Apartment in Manly", address: "22 South Steyne", suburb: "Manly", state: "NSW", postcode: "2095", price: 2200000, price_formatted: "$2,200,000", beds: 3, baths: 2, parking: 1, property_type: "apartment", lat: -33.7960, lng: 151.2870, description: "Sun-drenched three-bedroom apartment with sweeping ocean views from a generous wraparound balcony. Open-plan living with coastal-inspired finishes and Smeg kitchen. Direct beach access, Manly Corso dining, and ferry to the city in 30 minutes." },

    // BRISBANE & OTHER STATES
    { title: "Classic 4 Bedroom Queenslander in New Farm", address: "35 Moray Street", suburb: "New Farm", state: "QLD", postcode: "4005", price: 2100000, price_formatted: "$2,100,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -27.4680, lng: 153.0480, description: "Beautifully restored four-bedroom Queenslander with wraparound verandahs and city skyline views. High ceilings, VJ walls, and polished timber floors throughout. Modern kitchen with stone benchtops opens to a covered deck and pool. Walk to New Farm Park, James Street, and Howard Smith Wharves." },
    { title: "Industrial-Chic 3 Bedroom Warehouse in Teneriffe", address: "18 Macquarie Street", suburb: "Teneriffe", state: "QLD", postcode: "4005", price: 1380000, price_formatted: "$1,380,000", beds: 3, baths: 2, parking: 2, property_type: "apartment", lat: -27.4560, lng: 153.0510, description: "Converted woolstore three-bedroom apartment in iconic Teneriffe with soaring ceilings and exposed timber trusses. River glimpses from the entertaining balcony. Polished concrete floors, stone island kitchen, and split-system air conditioning. Walk to the Teneriffe ferry terminal and riverside dining." },
    { title: "Riverfront 5 Bedroom Estate in Hamilton", address: "5 Kingsford Smith Drive", suburb: "Hamilton", state: "QLD", postcode: "4007", price: 4500000, price_formatted: "$4,500,000", beds: 5, baths: 4, parking: 3, property_type: "house", lat: -27.4380, lng: 153.0630, description: "Trophy five-bedroom estate with direct Brisbane River frontage and private pontoon. Resort-style grounds feature infinity pool, spa, and championship putting green. Grand proportions with marble foyer, home theatre, wine room, and butler's kitchen. Minutes from Portside Wharf and the airport." },
    { title: "Beachfront 2 Bedroom Apartment on the Gold Coast", address: "99 The Esplanade", suburb: "Surfers Paradise", state: "QLD", postcode: "4217", price: 1200000, price_formatted: "$1,200,000", beds: 2, baths: 2, parking: 1, property_type: "apartment", lat: -28.0030, lng: 153.4290, description: "Absolute beachfront two-bedroom apartment with panoramic Pacific Ocean views from a full-width balcony. High-rise tower with resort pool, gym, and on-site management. Modern fitout with stone kitchen and floor-to-ceiling glass. Walk to Cavill Avenue shops, restaurants, and nightlife." },
    { title: "Hinterland Retreat 4 Bedroom Home in Noosa Heads", address: "7 Viewland Drive", suburb: "Noosa Heads", state: "QLD", postcode: "4567", price: 2800000, price_formatted: "$2,800,000", beds: 4, baths: 3, parking: 2, property_type: "house", lat: -26.3900, lng: 153.0920, description: "Private four-bedroom hinterland retreat set among tropical gardens with Noosa River and national park vistas. Open-plan pavilion design maximises cross-ventilation and natural light. Infinity pool overlooking the valley, separate guest suite, and minutes to Hastings Street and Main Beach." },
    { title: "Beachside 4 Bedroom Home in Cottesloe", address: "14 Marine Parade", suburb: "Cottesloe", state: "WA", postcode: "6011", price: 4200000, price_formatted: "$4,200,000", beds: 4, baths: 3, parking: 2, property_type: "house", lat: -31.9970, lng: 115.7530, description: "Stunning four-bedroom beachside residence with uninterrupted Indian Ocean views from multiple living areas. Contemporary design with limestone and timber accents, infinity pool, and rooftop terrace. Walk across to Cottesloe Beach and the famous sunset sessions at the Indiana teahouse." },
    { title: "Federation Bungalow 3 Bedroom in Subiaco", address: "22 Rokeby Road", suburb: "Subiaco", state: "WA", postcode: "6008", price: 1650000, price_formatted: "$1,650,000", beds: 3, baths: 2, parking: 1, property_type: "house", lat: -31.9490, lng: 115.8270, description: "Charming three-bedroom Federation bungalow with original leadlight windows, pressed tin ceilings, and wide jarrah floorboards. Tasteful modern extension with gourmet kitchen and alfresco dining. Established gardens with mature frangipani trees. Walk to Subiaco Oval, cafés, and the train station." },
    { title: "Character 4 Bedroom Home in Unley", address: "38 King William Road", suburb: "Unley", state: "SA", postcode: "5061", price: 1250000, price_formatted: "$1,250,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -34.9540, lng: 138.6050, description: "Elegant four-bedroom bluestone villa in the heart of Unley's café and boutique precinct. Original features include ornate fireplaces, ceiling roses, and wide central hallway. Rear extension with open-plan living and a private garden with mature hedging. Close to the CBD and Unley Park." },
    { title: "Family 4 Bedroom Home in Sandy Bay", address: "15 Churchill Avenue", suburb: "Sandy Bay", state: "TAS", postcode: "7005", price: 1200000, price_formatted: "$1,200,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -42.8950, lng: 147.3370, description: "Spacious four-bedroom family home with Derwent River views in prestigious Sandy Bay. Well-maintained gardens, separate living and dining rooms, and a modern kitchen with quality appliances. Close to the University of Tasmania, Sandy Bay shopping village, and Long Beach." },
    { title: "Tropical 4 Bedroom Home in Darwin", address: "8 East Point Road", suburb: "Fannie Bay", state: "NT", postcode: "0820", price: 780000, price_formatted: "$780,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -12.4340, lng: 130.8380, description: "Elevated four-bedroom tropical home near the Fannie Bay foreshore and East Point Reserve. Open-plan design with louvred windows for year-round cross-ventilation. Covered entertaining deck overlooking a saltwater pool. Walk to the Museum and Art Gallery of the Northern Territory." },
    { title: "Modern 2 Bedroom Apartment in Braddon", address: "30 Lonsdale Street", suburb: "Braddon", state: "ACT", postcode: "2612", price: 680000, price_formatted: "$680,000", beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -35.2720, lng: 149.1340, description: "Contemporary two-bedroom apartment in Braddon's thriving food and bar precinct. North-facing balcony, stone kitchen with integrated appliances, and generous built-in storage. Secure parking and storage cage. Walk to the Light Rail, ANU campus, and Civic." },
    { title: "Hinterland 5 Bedroom Home in Byron Bay", address: "42 Bangalow Road", suburb: "Byron Bay", state: "NSW", postcode: "2481", price: 2800000, price_formatted: "$2,800,000", beds: 5, baths: 3, parking: 3, property_type: "house", lat: -28.6420, lng: 153.6050, description: "Sprawling five-bedroom hinterland property set on 2 acres with panoramic views to Cape Byron lighthouse. Pavilion-style design with multiple living zones, chef's kitchen, and infinity pool. Separate guest cottage, organic orchard, and rainforest gully. Minutes from Byron town centre." },
    { title: "City Terrace 3 Bedroom in Geelong", address: "18 Moorabool Street", suburb: "Geelong", state: "VIC", postcode: "3220", price: 780000, price_formatted: "$780,000", beds: 3, baths: 1, parking: 1, property_type: "terrace", lat: -38.1490, lng: 144.3610, description: "Renovated three-bedroom Victorian terrace in the heart of Geelong's cultural precinct. Original façade with contemporary interiors, polished timber floors, and open-plan kitchen. Walk to the Geelong waterfront, Pakington Street, and the train station to Melbourne in under an hour." },
    { title: "Victorian 4 Bedroom Home in Ballarat", address: "55 Lydiard Street", suburb: "Ballarat Central", state: "VIC", postcode: "3350", price: 580000, price_formatted: "$580,000", beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.5610, lng: 143.8560, description: "Impressive four-bedroom Victorian home on Ballarat's grand Lydiard Street with original bluestone façade and iron lacework. High ceilings, marble fireplaces, and period detailing throughout. Large rear garden with established trees. Walk to the Ballarat Art Gallery and Sturt Street gardens." },
  ];

  const rentalListings = [
    { title: "Stylish 2 Bedroom Apartment for Rent in South Yarra", address: "88 Toorak Road", suburb: "South Yarra", state: "VIC", postcode: "3141", rental_weekly: 680, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8400, lng: 144.9800, description: "Modern two-bedroom apartment on Toorak Road with city views from a private balcony. Open-plan living with timber floors and a stone kitchen. Building includes pool and gym. Walk to Chapel Street, Prahran Market, and South Yarra station." },
    { title: "Character 3 Bedroom Terrace for Rent in Fitzroy", address: "30 Brunswick Street", suburb: "Fitzroy", state: "VIC", postcode: "3065", rental_weekly: 780, beds: 3, baths: 1, parking: 0, property_type: "terrace", lat: -37.8050, lng: 144.9770, description: "Charming three-bedroom terrace in the heart of Fitzroy with exposed brick, timber floors, and a sunny rear courtyard. Gas cooking, split-system air conditioning, and ceiling fans throughout. Walk to bars, galleries, and Edinburgh Gardens." },
    { title: "Cosy 1 Bedroom Apartment for Rent in Richmond", address: "45 Bridge Road", suburb: "Richmond", state: "VIC", postcode: "3121", rental_weekly: 450, beds: 1, baths: 1, parking: 0, property_type: "apartment", lat: -37.8190, lng: 144.9970, description: "Well-maintained one-bedroom apartment above Richmond's bustling Bridge Road strip. Timber floors, updated kitchen, and a spacious living area. Walk to Richmond station, the MCG, and Melbourne's best Vietnamese restaurants." },
    { title: "Studio for Rent in St Kilda", address: "25 Acland Street", suburb: "St Kilda", state: "VIC", postcode: "3182", rental_weekly: 390, beds: 0, baths: 1, parking: 0, property_type: "studio", lat: -37.8620, lng: 144.9730, description: "Bright studio apartment on St Kilda's famous Acland Street. Kitchenette with gas cooktop, built-in wardrobe, and a shared rooftop terrace with bay views. Steps from the beach, Luna Park, and tram routes to the city." },
    { title: "Spacious 4 Bedroom Family Home for Rent in Hawthorn", address: "18 Glenferrie Road", suburb: "Hawthorn", state: "VIC", postcode: "3122", rental_weekly: 1200, beds: 4, baths: 2, parking: 2, property_type: "house", lat: -37.8230, lng: 145.0360, description: "Grand four-bedroom family home in Hawthorn's leafy streets with formal and informal living areas, a modern kitchen, and a private rear garden. Gas ducted heating and evaporative cooling. Close to Scotch College, Swinburne University, and Glenferrie Road shops." },
    { title: "Bright 2 Bedroom Apartment for Rent near University in Carlton", address: "200 Lygon Street", suburb: "Carlton", state: "VIC", postcode: "3053", rental_weekly: 520, beds: 2, baths: 1, parking: 0, property_type: "apartment", lat: -37.8000, lng: 144.9670, description: "Light-filled two-bedroom apartment on Carlton's famous Lygon Street with balcony overlooking tree-lined streetscape. Updated kitchen and bathroom. Walk to the University of Melbourne, RMIT, and Carlton Gardens. Ideal for students or young professionals." },
    { title: "Renovated 3 Bedroom Terrace for Rent in Prahran", address: "15 High Street", suburb: "Prahran", state: "VIC", postcode: "3181", rental_weekly: 850, beds: 3, baths: 2, parking: 1, property_type: "terrace", lat: -37.8510, lng: 144.9930, description: "Fully renovated three-bedroom terrace in Prahran with a gourmet kitchen, European laundry, and a north-facing rear courtyard. Polished concrete floors and plantation shutters throughout. Walk to Prahran Market, Chapel Street, and Windsor station." },
    { title: "Warehouse-Style Apartment for Rent in Collingwood", address: "50 Easey Street", suburb: "Collingwood", state: "VIC", postcode: "3066", rental_weekly: 580, beds: 1, baths: 1, parking: 1, property_type: "apartment", lat: -37.8020, lng: 144.9860, description: "Unique warehouse-style one-bedroom apartment with soaring ceilings, exposed brick, and an industrial aesthetic. Open-plan kitchen and living. Secure car space included. Walk to Smith Street dining, Collingwood Yards, and easy tram access to the CBD." },
    { title: "Terrace 2 Bedroom for Rent in Surry Hills", address: "80 Bourke Street", suburb: "Surry Hills", state: "NSW", postcode: "2010", rental_weekly: 850, beds: 2, baths: 1, parking: 0, property_type: "terrace", lat: -33.8860, lng: 151.2140, description: "Stylish two-bedroom terrace in Surry Hills with a sun-drenched courtyard and modern finishes. Timber floors, stone kitchen, and air conditioning. Walk to Central Station, Crown Street dining, and Sydney's best coffee roasters." },
    { title: "Spacious 3 Bedroom House for Rent in Newtown", address: "40 Australia Street", suburb: "Newtown", state: "NSW", postcode: "2042", rental_weekly: 1050, beds: 3, baths: 2, parking: 1, property_type: "house", lat: -33.8980, lng: 151.1780, description: "Generous three-bedroom house on a quiet Newtown street with rear garden and off-street parking. Open-plan kitchen and living with air conditioning. Walk to King Street cafés, Newtown station, and Camperdown Park." },
    { title: "Modern 1 Bedroom Apartment for Rent in Bondi Junction", address: "120 Oxford Street", suburb: "Bondi Junction", state: "NSW", postcode: "2022", rental_weekly: 650, beds: 1, baths: 1, parking: 1, property_type: "apartment", lat: -33.8930, lng: 151.2470, description: "Modern one-bedroom apartment in Bondi Junction with secure parking and building gym. North-facing balcony, stone kitchen, and built-in robes. Above Westfield Bondi Junction with direct train access to the city and Bondi Beach bus routes." },
    { title: "Bright 2 Bedroom Apartment for Rent in Chatswood", address: "5 Help Street", suburb: "Chatswood", state: "NSW", postcode: "2067", rental_weekly: 750, beds: 2, baths: 2, parking: 1, property_type: "apartment", lat: -33.7970, lng: 151.1840, description: "Spacious two-bedroom apartment in Chatswood CBD with district views. Modern kitchen, air conditioning, and internal laundry. Building has pool, gym, and concierge. Steps from Chatswood station, Westfield, and Chatswood Chase." },
    { title: "Riverside 2 Bedroom Apartment for Rent in New Farm", address: "12 Barker Street", suburb: "New Farm", state: "QLD", postcode: "4005", rental_weekly: 620, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -27.4690, lng: 153.0490, description: "Charming two-bedroom apartment in a leafy New Farm street with polished timber floors and air conditioning. Private courtyard with mature plantings. Walk to New Farm Park, the Powerhouse, and James Street dining precinct." },
    { title: "Queenslander 3 Bedroom for Rent in West End", address: "28 Boundary Street", suburb: "West End", state: "QLD", postcode: "4101", rental_weekly: 780, beds: 3, baths: 1, parking: 1, property_type: "house", lat: -27.4810, lng: 153.0100, description: "Classic three-bedroom Queenslander with wide verandahs, high ceilings, and VJ walls. Fenced backyard, air conditioning, and ceiling fans throughout. Walk to the West End Markets, Davies Park, and South Bank Parklands." },
    { title: "Family 3 Bedroom Home for Rent in Doncaster", address: "22 Doncaster Road", suburb: "Doncaster", state: "VIC", postcode: "3108", rental_weekly: 650, beds: 3, baths: 2, parking: 2, property_type: "house", lat: -37.7870, lng: 145.1250, description: "Well-presented three-bedroom family home with open-plan living, gas ducted heating, and evaporative cooling. Double garage and a private rear garden. Close to Westfield Doncaster, city bus routes, and local parks." },
    { title: "Executive 4 Bedroom Home for Rent in Glen Waverley", address: "10 Bogong Avenue", suburb: "Glen Waverley", state: "VIC", postcode: "3150", rental_weekly: 1100, beds: 4, baths: 3, parking: 2, property_type: "house", lat: -37.8790, lng: 145.1640, description: "Impressive four-bedroom executive home in the Glen Waverley Secondary College zone. Multiple living zones, stone kitchen, and a covered alfresco with BBQ. Air conditioning, alarm system, and double lock-up garage. Walk to The Glen and Glen Waverley station." },
    { title: "Convenient 2 Bedroom Apartment for Rent in Box Hill", address: "8 Whitehorse Road", suburb: "Box Hill", state: "VIC", postcode: "3128", rental_weekly: 520, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8190, lng: 145.1220, description: "Modern two-bedroom apartment near Box Hill Hospital and the bustling Box Hill Central shopping centre. Air conditioning, secure parking, and building intercom. Walk to Box Hill station, bus interchange, and the vibrant Asian dining precinct." },
    { title: "Modern 2 Bedroom Apartment for Rent in South Melbourne", address: "55 Clarendon Street", suburb: "South Melbourne", state: "VIC", postcode: "3205", rental_weekly: 700, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8330, lng: 144.9580, description: "Sleek two-bedroom apartment in South Melbourne with city views from a wide north-facing balcony. Stone kitchen, split-system air conditioning, and secure basement parking. Walk to South Melbourne Market, the Arts Precinct, and Albert Park Lake." },
    { title: "Affordable 2 Bedroom Apartment for Rent in Footscray", address: "30 Leeds Street", suburb: "Footscray", state: "VIC", postcode: "3011", rental_weekly: 480, beds: 2, baths: 1, parking: 1, property_type: "apartment", lat: -37.8010, lng: 144.8990, description: "Well-located two-bedroom apartment in Footscray with easy access to the city via train or bus. Open-plan living with split-system heating and cooling. Secure entry and car space. Close to Victoria University, Footscray Market, and the Maribyrnong River." },
    { title: "Bayside 3 Bedroom Home for Rent in Williamstown", address: "12 Ferguson Street", suburb: "Williamstown", state: "VIC", postcode: "3016", rental_weekly: 750, beds: 3, baths: 1, parking: 1, property_type: "house", lat: -37.8570, lng: 144.8970, description: "Charming three-bedroom weatherboard home in Williamstown's village precinct. Polished timber floors, updated kitchen, and a sunny rear garden. Walk to Williamstown Beach, Nelson Place restaurants, and the ferry to the city. Gas heating and air conditioning." },
  ];

  // Mark first 20 sale listings as featured
  const saleRows = saleListings.map((l, i) => ({
    ...common,
    ...l,
    listing_type: "sale",
    is_featured: i < 20,
    listing_category: "sale",
  }));

  const rentalRows = rentalListings.map((l) => ({
    ...common,
    ...l,
    listing_type: "rent",
    listing_category: "rent",
    price: null,
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
