// Seed 68 demo Melbourne property listings tagged 'demo_batch:alan_2026'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const AGENT_ID = '53fd551f-a2de-4dbe-ab25-7045bf641e55';
const TAG = 'demo_batch:alan_2026';

const IMG = {
  house: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80',
  apartment: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
  office: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80',
  retail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
  warehouse: 'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=800&q=80',
  rentalHouse: 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80',
  rentalApt: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
};

const fmt = (n: number) => '$' + n.toLocaleString('en-AU');
const fmtPw = (n: number) => '$' + n.toLocaleString('en-AU') + ' per week';

interface L {
  title: string; address: string; suburb: string; price: number;
  beds: number; baths: number; parking: number; sqm: number;
  property_type: string; listing_type: string; listing_category: 'sale' | 'rent';
  description: string; features: string[]; img: string;
  rental_weekly?: number;
}

const listings: L[] = [
  // 14 houses for sale
  { title: 'Grand Edwardian Family Residence', address: '12 St Georges Road', suburb: 'Toorak', price: 6850000, beds: 5, baths: 4, parking: 3, sqm: 820, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'A stately Edwardian home set on a generous 820sqm allotment in blue-ribbon Toorak. Showcasing soaring ceilings, ornate cornices and a sun-drenched north-facing rear garden. Walk to Toorak Village and elite schools.', features: ['Pool','Tennis Court','Wine Cellar','Cinema Room','Underfloor Heating'], img: IMG.house },
  { title: 'Renovated Federation Charmer', address: '47 Sackville Street', suburb: 'Kew', price: 3450000, beds: 4, baths: 3, parking: 2, sqm: 612, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Beautifully renovated Federation home blending period charm with contemporary luxury. Open-plan living flows to landscaped gardens. Walk to Kew Junction and trams.', features: ['North-Facing','Period Features','Hydronic Heating','Alfresco'], img: IMG.house },
  { title: 'Warehouse Conversion Masterpiece', address: '23 Lennox Street', suburb: 'Richmond', price: 2890000, beds: 3, baths: 2, parking: 2, sqm: 340, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Spectacular warehouse conversion with double-height ceilings, exposed brick and polished concrete floors. Rooftop terrace with city views. Steps to Bridge Road and Swan Street.', features: ['Rooftop Terrace','City Views','Polished Concrete','Smart Home'], img: IMG.house },
  { title: 'Victorian Terrace with Studio', address: '88 George Street', suburb: 'Fitzroy', price: 2150000, beds: 3, baths: 2, parking: 1, sqm: 245, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Quintessential double-fronted Victorian on the iconic George Street. Restored period detail meets modern kitchen and bathrooms. Rear studio ideal for WFH or guests.', features: ['Studio','Period Features','Garden','Off-Street Parking'], img: IMG.house },
  { title: 'Architect-Designed Contemporary Family Home', address: '15 Beresford Road', suburb: 'Balwyn North', price: 4200000, beds: 5, baths: 4, parking: 2, sqm: 745, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Striking architect-designed home in the Balwyn High zone. Soaring voids, full-height glazing and a north-facing pool. Premium finishes throughout.', features: ['Pool','Balwyn High Zone','Solar','Home Theatre'], img: IMG.house },
  { title: 'Luxury Townhouse on the Hill', address: '6 Walsh Street', suburb: 'South Yarra', price: 3950000, beds: 4, baths: 3, parking: 2, sqm: 380, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Sophisticated three-level townhouse moments from the Royal Botanic Gardens. Lift access, basement garage and rooftop entertaining with city skyline views.', features: ['Lift','Rooftop','City Views','Wine Cellar'], img: IMG.house },
  { title: 'Californian Bungalow Beauty', address: '34 Power Street', suburb: 'Hawthorn', price: 2780000, beds: 4, baths: 2, parking: 2, sqm: 580, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Classic Californian Bungalow in a sought-after Hawthorn pocket. Light-filled living areas, established gardens and a separate retreat. Walk to Glenferrie Road.', features: ['Period Features','Garden','Fireplace','Tram Zone'], img: IMG.house },
  { title: 'Modern Single-Level Family Sanctuary', address: '21 Cawkwell Street', suburb: 'Prahran', price: 2250000, beds: 3, baths: 2, parking: 2, sqm: 320, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Sleek single-level home behind a Victorian facade. Open-plan kitchen with stone island, full-height stacker doors to a sunny courtyard. Greville Street precinct.', features: ['Courtyard','Stone Kitchen','Smart Lock','Ducted Heat/Cool'], img: IMG.house },
  { title: 'Elegant Edwardian on Tree-Lined Street', address: '92 Gladstone Avenue', suburb: 'Malvern', price: 3650000, beds: 4, baths: 3, parking: 2, sqm: 690, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Substantial family Edwardian on a leafy avenue, walking distance to Glenferrie Road and Malvern Central. Generous proportions and a deep north-facing garden.', features: ['North Garden','Period Features','Pool','Study'], img: IMG.house },
  { title: 'Coburg Mid-Century Renovator', address: '18 Reynard Street', suburb: 'Coburg', price: 1295000, beds: 3, baths: 1, parking: 2, sqm: 605, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Solid 1950s brick home on a generous block, offering scope to renovate, extend or rebuild (STCA). Walk to Sydney Road trams and Coburg Square.', features: ['Large Block','Renovator','Subdivision Potential (STCA)'], img: IMG.house },
  { title: 'Family Entertainer Near the Lake', address: '7 Wilson Street', suburb: 'Moonee Ponds', price: 1875000, beds: 4, baths: 2, parking: 2, sqm: 550, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Stylish family home moments from Queens Park and Puckle Street. Open-plan living with full-height stackers to alfresco and pool. Zoned for Moonee Ponds Primary.', features: ['Pool','Alfresco','School Zone','Solar'], img: IMG.house },
  { title: 'Bay-Side Heritage Home', address: '14 Cecil Street', suburb: 'Williamstown', price: 2150000, beds: 4, baths: 2, parking: 2, sqm: 520, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Beautifully presented Victorian moments to the foreshore and Nelson Place. Extended rear with skylit kitchen and north-facing courtyard.', features: ['Period Features','North Courtyard','Walk to Beach'], img: IMG.house },
  { title: 'Inner-West Family Favourite', address: '52 Anderson Street', suburb: 'Yarraville', price: 1685000, beds: 4, baths: 2, parking: 1, sqm: 410, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Stylishly extended weatherboard in the heart of Yarraville Village. Open kitchen/living with bi-folds to a deep north garden. Walk to the train and cinema.', features: ['North Garden','Open-Plan','Walk to Village'], img: IMG.house },
  { title: 'Stylish Family Home in Carnegie', address: '36 Truganini Road', suburb: 'Carnegie', price: 1750000, beds: 4, baths: 3, parking: 2, sqm: 480, property_type: 'House', listing_type: 'sale', listing_category: 'sale', description: 'Designer two-storey home offering family-friendly living in the McKinnon Secondary zone. Light-filled interiors, alfresco and low-maintenance garden.', features: ['McKinnon Zone','Alfresco','Ducted A/C'], img: IMG.house },

  // 11 apartments/units for sale
  { title: 'Skyline Sub-Penthouse', address: '3501/250 Spencer Street', suburb: 'Melbourne', price: 1950000, beds: 3, baths: 2, parking: 2, sqm: 165, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Spectacular sub-penthouse with sweeping north-east city and bay views. Premium finishes, gourmet kitchen and resort-style amenities including pool, gym and concierge.', features: ['City Views','Pool','Gym','Concierge'], img: IMG.apartment },
  { title: 'Riverside Designer Apartment', address: '1208/8 Kavanagh Street', suburb: 'Southbank', price: 985000, beds: 2, baths: 2, parking: 1, sqm: 96, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Light-filled apartment with floor-to-ceiling glass and Yarra River outlook. Walk to Crown, the Arts Precinct and South Melbourne Market.', features: ['River Views','Pool','Gym','Balcony'], img: IMG.apartment },
  { title: 'Docklands Waterfront Residence', address: '904/100 Harbour Esplanade', suburb: 'Docklands', price: 845000, beds: 2, baths: 2, parking: 1, sqm: 88, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Contemporary waterfront apartment with marina views and a wraparound balcony. Steps to Marvel Stadium, the Star and tram services.', features: ['Marina Views','Wrap Balcony','Concierge'], img: IMG.apartment },
  { title: 'Boutique Carlton Apartment', address: '12/45 Drummond Street', suburb: 'Carlton', price: 695000, beds: 2, baths: 1, parking: 1, sqm: 72, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Stylish apartment in a low-rise boutique block moments from Lygon Street and Melbourne University. Light-filled living with leafy outlook.', features: ['Boutique Block','Walk to Uni','Balcony'], img: IMG.apartment },
  { title: 'Beachside Art Deco Apartment', address: '6/14 Marine Parade', suburb: 'St Kilda', price: 720000, beds: 2, baths: 1, parking: 1, sqm: 78, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Charming Art Deco apartment directly opposite St Kilda beach. Original features, updated kitchen and bathroom, and a sun-drenched living room.', features: ['Beachfront','Period Features','Renovated'], img: IMG.apartment },
  { title: 'Port Melbourne Garden Apartment', address: '4/55 Bay Street', suburb: 'Port Melbourne', price: 880000, beds: 2, baths: 2, parking: 1, sqm: 95, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Spacious ground-floor apartment with private north-facing courtyard. Walk to the beach, light rail and Bay Street cafés.', features: ['Courtyard','Walk to Beach','Light Rail'], img: IMG.apartment },
  { title: 'Brunswick East Warehouse Loft', address: '8/120 Lygon Street', suburb: 'Brunswick East', price: 745000, beds: 2, baths: 2, parking: 1, sqm: 105, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'New York-inspired loft with soaring ceilings, polished concrete floors and exposed steel. Communal rooftop with city skyline views.', features: ['Loft Style','Rooftop','City Views'], img: IMG.apartment },
  { title: 'Modern Townhouse-Style Unit', address: '2/19 Hall Street', suburb: 'Moonee Ponds', price: 815000, beds: 3, baths: 2, parking: 1, sqm: 138, property_type: 'Unit', listing_type: 'sale', listing_category: 'sale', description: 'Stylish double-storey unit with three bedrooms and two living zones. Private courtyard and lock-up garage. Walk to Puckle Street and the train.', features: ['Two Living','Courtyard','LUG'], img: IMG.apartment },
  { title: 'Essendon Boutique Block Apartment', address: '5/22 Leslie Road', suburb: 'Essendon', price: 595000, beds: 2, baths: 2, parking: 1, sqm: 82, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Modern apartment in a sought-after boutique complex. Open-plan living to a north-facing balcony. Easy access to CityLink and tram 59.', features: ['North Balcony','Boutique','Secure Parking'], img: IMG.apartment },
  { title: 'Williamstown Bayside Apartment', address: '14/2 Ann Street', suburb: 'Williamstown', price: 925000, beds: 2, baths: 2, parking: 2, sqm: 110, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Premium apartment with bay glimpses and a generous terrace. Two secure car spaces and storage cage. Stroll to the foreshore and Nelson Place.', features: ['Bay Glimpses','Terrace','2 x Car Spaces'], img: IMG.apartment },
  { title: 'South Melbourne Loft Apartment', address: '7/300 Coventry Street', suburb: 'South Melbourne', price: 870000, beds: 2, baths: 2, parking: 1, sqm: 98, property_type: 'Apartment', listing_type: 'sale', listing_category: 'sale', description: 'Industrial-chic loft moments from South Melbourne Market and Albert Park Lake. Soaring ceilings, mezzanine bedroom and city views.', features: ['Loft','Mezzanine','City Views'], img: IMG.apartment },

  // 2 land for sale
  { title: 'Premium Building Allotment', address: '12 Atherton Road', suburb: 'Oakleigh', price: 1395000, beds: 0, baths: 0, parking: 0, sqm: 720, property_type: 'Land', listing_type: 'sale', listing_category: 'sale', description: 'Rare opportunity to secure a level 720sqm allotment in central Oakleigh. Build your dream home or develop multi-unit (STCA). All services available.', features: ['Level Block','Services Available','Develop STCA'], img: IMG.house },
  { title: 'Elevated Land with Treetop Outlook', address: '38 Tortice Drive', suburb: 'Doncaster East', price: 1685000, beds: 0, baths: 0, parking: 0, sqm: 905, property_type: 'Land', listing_type: 'sale', listing_category: 'sale', description: 'Generous 905sqm allotment in the East Doncaster Secondary College zone. Elevated position with leafy outlook, perfect for a bespoke family residence.', features: ['Premium Zone','Elevated','Treetop Outlook'], img: IMG.house },

  // 12 houses for rent
  { title: 'Stunning Family Home in Toorak', address: '8 Heyington Place', suburb: 'Toorak', price: 0, beds: 5, baths: 4, parking: 3, sqm: 740, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Executive family residence in a prized Toorak pocket. Pool, north garden and walk to elite schools. Furnished or unfurnished.', features: ['Pool','Furnished Optional','School Zone'], img: IMG.rentalHouse, rental_weekly: 2950 },
  { title: 'Designer Home Walking to Chapel Street', address: '24 Caroline Street', suburb: 'South Yarra', price: 0, beds: 4, baths: 3, parking: 2, sqm: 380, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Beautifully appointed townhouse-style home with three living zones. Roof terrace with city views. Walk to Domain Interchange and Chapel Street.', features: ['Roof Terrace','Lift','City Views'], img: IMG.rentalHouse, rental_weekly: 1850 },
  { title: 'Charming Fitzroy Terrace', address: '116 Napier Street', suburb: 'Fitzroy', price: 0, beds: 3, baths: 2, parking: 1, sqm: 220, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Renovated Victorian terrace with skylit kitchen and north-facing courtyard. Walk to Brunswick Street, Smith Street and CBD trams.', features: ['Period Features','Courtyard','Walk to Cafés'], img: IMG.rentalHouse, rental_weekly: 1150 },
  { title: 'Northcote Family Home with Pool', address: '42 Westgarth Street', suburb: 'Northcote', price: 0, beds: 4, baths: 2, parking: 2, sqm: 510, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Spacious family home with pool, alfresco and large grassed yard. Zoned for Northcote High and steps to High Street.', features: ['Pool','Alfresco','School Zone','Pets Considered'], img: IMG.rentalHouse, rental_weekly: 1095 },
  { title: 'Renovated Preston Family Home', address: '19 Murray Road', suburb: 'Preston', price: 0, beds: 4, baths: 2, parking: 2, sqm: 460, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Beautifully renovated family home with two living zones and large entertainers deck. Walk to Preston Market and Bell Street trams.', features: ['Two Living','Deck','Walk to Market'], img: IMG.rentalHouse, rental_weekly: 850 },
  { title: 'Collingwood Warehouse-Style House', address: '78 Easey Street', suburb: 'Collingwood', price: 0, beds: 3, baths: 2, parking: 1, sqm: 250, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Industrial-style home with soaring ceilings, polished concrete and rooftop deck. The ultimate inner-city lifestyle on Smith Street\'s doorstep.', features: ['Rooftop Deck','Polished Concrete','Walk to Smith St'], img: IMG.rentalHouse, rental_weekly: 1250 },
  { title: 'Camberwell Family Classic', address: '15 Athelstan Road', suburb: 'Camberwell', price: 0, beds: 4, baths: 3, parking: 2, sqm: 620, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Substantial family home in the Camberwell High zone. Multiple living areas, large garden and double garage. Walk to Burke Road shops.', features: ['School Zone','Large Garden','Double Garage'], img: IMG.rentalHouse, rental_weekly: 1450 },
  { title: 'Brunswick Renovated Cottage', address: '34 Albert Street', suburb: 'Brunswick', price: 0, beds: 3, baths: 2, parking: 1, sqm: 280, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Stylish renovated cottage with skylit open-plan living and north-facing courtyard. Walk to Sydney Road, Jewell Station and trams.', features: ['North Courtyard','Renovated','Walk to Train'], img: IMG.rentalHouse, rental_weekly: 875 },
  { title: 'Yarraville Village Family Home', address: '11 Powell Street', suburb: 'Yarraville', price: 0, beds: 3, baths: 2, parking: 1, sqm: 360, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Extended weatherboard with open-plan living and alfresco. Pets considered. Walk to Yarraville Village, the train and cinema.', features: ['Alfresco','Pets Considered','Walk to Village'], img: IMG.rentalHouse, rental_weekly: 795 },
  { title: 'Kensington Townhouse', address: '8 Eastwood Street', suburb: 'Kensington', price: 0, beds: 3, baths: 2, parking: 2, sqm: 210, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Modern three-bedroom townhouse with two living zones, courtyard and double garage. Steps to Kensington Station and Macaulay Road shops.', features: ['Two Living','Courtyard','Double Garage'], img: IMG.rentalHouse, rental_weekly: 825 },
  { title: 'Ascot Vale Family Sanctuary', address: '27 Maribyrnong Road', suburb: 'Ascot Vale', price: 0, beds: 4, baths: 2, parking: 2, sqm: 480, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Charming family home with separate living and dining, generous garden and undercover alfresco. Walk to Union Road shops and the train.', features: ['Garden','Alfresco','School Zone'], img: IMG.rentalHouse, rental_weekly: 895 },
  { title: 'Abbotsford Riverside Townhouse', address: '14 Yarra Street', suburb: 'Abbotsford', price: 0, beds: 3, baths: 2, parking: 2, sqm: 230, property_type: 'House', listing_type: 'rent', listing_category: 'rent', description: 'Contemporary townhouse moments from the Yarra River trail and Victoria Park. Three bedrooms, two living zones and a private courtyard.', features: ['River Trail','Courtyard','Two Living'], img: IMG.rentalHouse, rental_weekly: 950 },

  // 12 apartments for rent
  { title: 'CBD Skyline Apartment', address: '4502/120 A\'Beckett Street', suburb: 'Melbourne', price: 0, beds: 2, baths: 2, parking: 1, sqm: 88, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'High-floor two-bedroom apartment with sweeping city views. Building amenities include pool, gym, sauna and 24/7 concierge.', features: ['City Views','Pool','Gym','Concierge'], img: IMG.rentalApt, rental_weekly: 850 },
  { title: 'Southbank Riverview Apartment', address: '2304/9 Power Street', suburb: 'Southbank', price: 0, beds: 2, baths: 2, parking: 1, sqm: 92, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Light-filled apartment with Yarra and city views. Walk to Crown, Southbank Promenade and the Arts Precinct.', features: ['River Views','Pool','Gym'], img: IMG.rentalApt, rental_weekly: 780 },
  { title: 'St Kilda Road Boutique Apartment', address: '8/520 St Kilda Road', suburb: 'Melbourne', price: 0, beds: 2, baths: 2, parking: 1, sqm: 95, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Beautifully renovated apartment on Melbourne\'s most prestigious boulevard. Tram at the door, walk to Albert Park Lake and the Tan.', features: ['Renovated','Tram at Door','Walk to Park'], img: IMG.rentalApt, rental_weekly: 720 },
  { title: 'Richmond Designer Apartment', address: '305/12 Gwynne Street', suburb: 'Richmond', price: 0, beds: 2, baths: 2, parking: 1, sqm: 78, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Contemporary apartment in the Cremorne tech precinct. Walk to Bridge Road, Swan Street and East Richmond Station.', features: ['Walk to Train','Balcony','Secure Parking'], img: IMG.rentalApt, rental_weekly: 650 },
  { title: 'Carlton Studio with Character', address: '14/180 Faraday Street', suburb: 'Carlton', price: 0, beds: 1, baths: 1, parking: 0, sqm: 45, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Charming Art Deco studio steps from Lygon Street and Melbourne University. Polished floors and a bright north-facing aspect.', features: ['Period Features','North-Facing','Walk to Uni'], img: IMG.rentalApt, rental_weekly: 420 },
  { title: 'Port Melbourne Beachside Apartment', address: '12/180 Beach Street', suburb: 'Port Melbourne', price: 0, beds: 2, baths: 2, parking: 1, sqm: 86, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Second-floor apartment with bay glimpses and large entertainer\'s balcony. Walk to the beach, light rail and Bay Street.', features: ['Bay Glimpses','Balcony','Walk to Beach'], img: IMG.rentalApt, rental_weekly: 695 },
  { title: 'Docklands Marina Apartment', address: '1402/8 Marmion Place', suburb: 'Docklands', price: 0, beds: 2, baths: 2, parking: 1, sqm: 90, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Modern apartment with marina views, two bathrooms and secure parking. Building gym and pool. Walk to Marvel Stadium.', features: ['Marina Views','Pool','Gym'], img: IMG.rentalApt, rental_weekly: 720 },
  { title: 'Hawthorn Boutique Apartment', address: '4/22 Auburn Road', suburb: 'Hawthorn', price: 0, beds: 2, baths: 1, parking: 1, sqm: 72, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Stylish apartment in a small block moments from Glenferrie Road, trams and Swinburne. Open-plan living to a sun-drenched balcony.', features: ['Balcony','Walk to Glenferrie','Boutique Block'], img: IMG.rentalApt, rental_weekly: 565 },
  { title: 'Elwood Beachside Apartment', address: '7/14 Broadway', suburb: 'Elwood', price: 0, beds: 2, baths: 1, parking: 1, sqm: 70, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Renovated apartment in a leafy Elwood pocket. Walk to the beach, Ormond Road cafés and Elsternwick Station.', features: ['Walk to Beach','Renovated','Period Features'], img: IMG.rentalApt, rental_weekly: 595 },
  { title: 'East Melbourne Garden Apartment', address: '3/100 Powlett Street', suburb: 'East Melbourne', price: 0, beds: 2, baths: 1, parking: 1, sqm: 82, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Ground-floor apartment with private courtyard in a tightly held East Melbourne block. Walk to Fitzroy Gardens and the MCG.', features: ['Courtyard','Walk to MCG','Period Features'], img: IMG.rentalApt, rental_weekly: 720 },
  { title: 'South Yarra Designer Pad', address: '610/50 Claremont Street', suburb: 'South Yarra', price: 0, beds: 2, baths: 2, parking: 1, sqm: 84, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Sleek apartment with stone kitchen, full-height glass and city views. Walk to South Yarra Station and Chapel Street.', features: ['City Views','Pool','Gym'], img: IMG.rentalApt, rental_weekly: 750 },
  { title: 'Executive St Kilda Road Apartment', address: '1801/620 St Kilda Road', suburb: 'Melbourne', price: 0, beds: 3, baths: 2, parking: 2, sqm: 145, property_type: 'Apartment', listing_type: 'rent', listing_category: 'rent', description: 'Executive three-bedroom apartment with bay and city views, two car spaces and resort-style amenities including pool, gym and tennis.', features: ['Bay Views','Tennis','Pool','2 x Parking'], img: IMG.rentalApt, rental_weekly: 1450 },

  // 6 commercial offices
  { title: 'Premium Collins Street Office Suite', address: 'Level 12, 459 Collins Street', suburb: 'Melbourne', price: 1850000, beds: 0, baths: 2, parking: 2, sqm: 320, property_type: 'Office', listing_type: 'commercial', listing_category: 'sale', description: 'A-grade office suite in the heart of the legal and financial precinct. Floor-to-ceiling glazing, premium end-of-trip facilities and 24/7 access.', features: ['A-Grade','EOT Facilities','24/7 Access','City Views'], img: IMG.office },
  { title: 'St Kilda Road Whole-Floor Office', address: 'Level 5, 380 St Kilda Road', suburb: 'Melbourne', price: 2950000, beds: 0, baths: 3, parking: 6, sqm: 480, property_type: 'Office', listing_type: 'commercial', listing_category: 'sale', description: 'Whole-floor office with leafy boulevard views, generous parking and excellent natural light on three sides. Tram at the door.', features: ['Whole Floor','Boulevard Views','6 x Parking'], img: IMG.office },
  { title: 'Cremorne Tech-Precinct Office', address: '85 Dover Street', suburb: 'Cremorne', price: 3450000, beds: 0, baths: 4, parking: 8, sqm: 650, property_type: 'Office', listing_type: 'commercial', listing_category: 'sale', description: 'Architect-designed warehouse-conversion office in Melbourne\'s premier tech precinct. Open-plan with break-out zones, meeting rooms and rooftop terrace.', features: ['Warehouse Conversion','Rooftop','Meeting Rooms'], img: IMG.office },
  { title: 'Hawthorn Medical Suites', address: 'Suite 3, 690 Burwood Road', suburb: 'Hawthorn', price: 1450000, beds: 0, baths: 3, parking: 4, sqm: 220, property_type: 'Office', listing_type: 'commercial', listing_category: 'sale', description: 'Established medical suites with five consult rooms, reception and waiting area. Long-term tenants in place. On-site parking.', features: ['Medical Fit-Out','Parking','Established'], img: IMG.office },
  { title: 'South Melbourne Boutique Office', address: '102 Bank Street', suburb: 'South Melbourne', price: 1850000, beds: 0, baths: 2, parking: 3, sqm: 310, property_type: 'Office', listing_type: 'commercial', listing_category: 'sale', description: 'Two-level character office with exposed brick, timber floors and skylit boardroom. Walk to South Melbourne Market.', features: ['Character Building','Boardroom','Two Levels'], img: IMG.office },
  { title: 'Richmond Heritage Office Building', address: '210 Bridge Road', suburb: 'Richmond', price: 4250000, beds: 0, baths: 4, parking: 6, sqm: 580, property_type: 'Office', listing_type: 'commercial', listing_category: 'sale', description: 'Iconic three-level heritage office building on Bridge Road with secure rear parking. Boutique brand HQ opportunity.', features: ['Heritage','Three Levels','Rear Parking'], img: IMG.office },

  // 6 retail spaces
  { title: 'Chapel Street Flagship Retail', address: '352 Chapel Street', suburb: 'Prahran', price: 2950000, beds: 0, baths: 1, parking: 0, sqm: 220, property_type: 'Retail', listing_type: 'commercial', listing_category: 'sale', description: 'High-profile flagship retail on Chapel Street with double-frontage and basement storage. Long-standing fashion tenant in place.', features: ['Double Frontage','Basement Storage','Heart of Chapel'], img: IMG.retail },
  { title: 'Brunswick Café Premises', address: '450 Sydney Road', suburb: 'Brunswick', price: 1495000, beds: 0, baths: 2, parking: 0, sqm: 145, property_type: 'Retail', listing_type: 'commercial', listing_category: 'sale', description: 'Established café premises with full commercial fit-out, outdoor seating permits and high pedestrian traffic. Sold as a going concern.', features: ['Café Fit-Out','Outdoor Seating','Going Concern'], img: IMG.retail },
  { title: 'Greville Street Boutique Shop', address: '152 Greville Street', suburb: 'Prahran', price: 1185000, beds: 0, baths: 1, parking: 0, sqm: 95, property_type: 'Retail', listing_type: 'commercial', listing_category: 'sale', description: 'Charming retail shop in Prahran\'s premier lifestyle precinct. High ceilings, polished floors and excellent natural light.', features: ['Period Features','High Ceilings','Lifestyle Precinct'], img: IMG.retail },
  { title: 'Lygon Street Restaurant', address: '220 Lygon Street', suburb: 'Carlton', price: 2250000, beds: 0, baths: 2, parking: 0, sqm: 180, property_type: 'Retail', listing_type: 'commercial', listing_category: 'sale', description: 'Iconic Lygon Street restaurant premises with full commercial kitchen, dining for 80 and pavement seating. High exposure trophy asset.', features: ['Commercial Kitchen','Pavement Seating','Trophy Asset'], img: IMG.retail },
  { title: 'Fitzroy Corner Freehold', address: '395 Brunswick Street', suburb: 'Fitzroy', price: 3450000, beds: 0, baths: 2, parking: 1, sqm: 245, property_type: 'Retail', listing_type: 'commercial', listing_category: 'sale', description: 'Prized corner freehold on Brunswick Street with wraparound frontage and a residential apartment above. Significant value-add upside.', features: ['Corner Freehold','Apartment Above','Value-Add'], img: IMG.retail },
  { title: 'Moonee Ponds Strip Retail', address: '88 Puckle Street', suburb: 'Moonee Ponds', price: 1395000, beds: 0, baths: 1, parking: 0, sqm: 130, property_type: 'Retail', listing_type: 'commercial', listing_category: 'sale', description: 'Strip retail premises on Puckle Street with excellent foot traffic. Long-term established tenant on a renewed lease.', features: ['Long Lease','High Foot Traffic','Established Tenant'], img: IMG.retail },

  // 5 warehouses/industrial
  { title: 'Port Melbourne Logistics Warehouse', address: '45 Salmon Street', suburb: 'Port Melbourne', price: 5850000, beds: 0, baths: 2, parking: 12, sqm: 1850, property_type: 'Industrial', listing_type: 'commercial', listing_category: 'sale', description: 'High-clearance logistics warehouse with two recessed loading docks, container access and office mezzanine. Strategic west-side location.', features: ['Loading Docks','Container Access','Office Mezzanine'], img: IMG.warehouse },
  { title: 'Laverton North Industrial Facility', address: '120 Boundary Road', suburb: 'Laverton North', price: 8950000, beds: 0, baths: 3, parking: 25, sqm: 4200, property_type: 'Industrial', listing_type: 'commercial', listing_category: 'sale', description: 'Modern industrial facility in Melbourne\'s premier western logistics hub. Multiple roller doors, 12m clearance and large hardstand.', features: ['12m Clearance','Hardstand','Multiple Roller Doors'], img: IMG.warehouse },
  { title: 'Moorabbin Showroom & Warehouse', address: '320 South Road', suburb: 'Moorabbin', price: 3450000, beds: 0, baths: 2, parking: 15, sqm: 1450, property_type: 'Industrial', listing_type: 'commercial', listing_category: 'sale', description: 'Combined showroom, office and warehouse with high-profile South Road frontage. Two-storey office and rear warehouse with crane.', features: ['Showroom','Crane','Highway Exposure'], img: IMG.warehouse },
  { title: 'Dandenong South Distribution Hub', address: '88 National Drive', suburb: 'Dandenong South', price: 12500000, beds: 0, baths: 4, parking: 35, sqm: 6500, property_type: 'Industrial', listing_type: 'commercial', listing_category: 'sale', description: 'Major distribution facility with multiple recessed docks, hardstand for B-double access and high-clearance warehouse. Walk to freeway.', features: ['B-Double Access','Recessed Docks','Freeway Access'], img: IMG.warehouse },
  { title: 'Brunswick Creative Workshop', address: '78 Weston Street', suburb: 'Brunswick', price: 2150000, beds: 0, baths: 2, parking: 4, sqm: 540, property_type: 'Industrial', listing_type: 'commercial', listing_category: 'sale', description: 'Character brick workshop with sawtooth roof, ideal for creative studios, makers or boutique manufacturing. Mezzanine office.', features: ['Sawtooth Roof','Mezzanine','Character'], img: IMG.warehouse },
];

// Premier picks (8 across types)
const premierIdx = new Set([0, 14, 25, 27, 39, 51, 57, 63]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const rows = listings.map((l, i) => {
      const isRent = l.listing_category === 'rent';
      const priceForRent = l.rental_weekly ? l.rental_weekly : 0;
      const finalPrice = isRent ? priceForRent : l.price;
      const isPremier = premierIdx.has(i);
      return {
        title: l.title,
        address: l.address,
        suburb: l.suburb,
        state: 'VIC',
        country: 'Australia',
        price: finalPrice,
        price_formatted: isRent ? fmtPw(l.rental_weekly || 0) : fmt(l.price),
        beds: l.beds,
        baths: l.baths,
        parking: l.parking,
        sqm: l.sqm,
        property_type: l.property_type,
        listing_type: l.listing_type,
        listing_category: l.listing_category,
        listing_mode: 'public',
        description: l.description,
        features: l.features,
        image_url: l.img,
        images: [l.img],
        agent_id: AGENT_ID,
        is_active: true,
        status: 'active',
        moderation_status: 'approved',
        translation_status: 'pending',
        currency_code: 'AUD',
        rental_weekly: l.rental_weekly ?? null,
        is_featured: isPremier,
        boost_tier: isPremier ? 'premier' : null,
        tags: [TAG],
      };
    });

    const { data, error } = await supabase.from('properties').insert(rows).select('id');
    if (error) {
      console.error('Insert error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, inserted: data?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
