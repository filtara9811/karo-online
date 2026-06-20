// Curated list of Indian cities for the registration address picker.
// "Other" option lets the user type a city that isn't listed.

export type CityEntry = {
  name: string;
  state: string;
  /** Frequently-used localities. "Other" is appended automatically. */
  areas: string[];
};

export const INDIA_CITIES: CityEntry[] = [
  { name: "Mumbai", state: "Maharashtra", areas: ["Andheri", "Bandra", "Borivali", "Dadar", "Goregaon", "Juhu", "Kandivali", "Kurla", "Malad", "Powai", "Thane", "Vashi", "Worli"] },
  { name: "Delhi", state: "Delhi", areas: ["Connaught Place", "Dwarka", "Karol Bagh", "Lajpat Nagar", "Rohini", "Saket", "Janakpuri", "Pitampura", "Vasant Kunj", "Mayur Vihar", "Chandni Chowk", "Sadar Bazar"] },
  { name: "New Delhi", state: "Delhi", areas: ["CP", "Khan Market", "Hauz Khas", "Greater Kailash", "Defence Colony", "Nehru Place", "Sarojini Nagar"] },
  { name: "Bengaluru", state: "Karnataka", areas: ["Indiranagar", "Koramangala", "HSR Layout", "Whitefield", "Marathahalli", "Jayanagar", "JP Nagar", "Electronic City", "Hebbal", "BTM Layout", "MG Road"] },
  { name: "Hyderabad", state: "Telangana", areas: ["Banjara Hills", "Jubilee Hills", "Gachibowli", "Hitech City", "Madhapur", "Kukatpally", "Secunderabad", "Begumpet", "Ameerpet", "Charminar"] },
  { name: "Chennai", state: "Tamil Nadu", areas: ["T. Nagar", "Anna Nagar", "Velachery", "Adyar", "Mylapore", "Tambaram", "OMR", "Nungambakkam", "Egmore", "Porur"] },
  { name: "Kolkata", state: "West Bengal", areas: ["Park Street", "Salt Lake", "New Town", "Howrah", "Ballygunge", "Behala", "Garia", "Jadavpur", "Esplanade", "Dum Dum"] },
  { name: "Pune", state: "Maharashtra", areas: ["Koregaon Park", "Viman Nagar", "Baner", "Hinjewadi", "Aundh", "Kothrud", "Hadapsar", "Wakad", "Camp", "Shivaji Nagar"] },
  { name: "Ahmedabad", state: "Gujarat", areas: ["Satellite", "Bopal", "Vastrapur", "Navrangpura", "Maninagar", "Bodakdev", "Prahlad Nagar", "SG Highway", "CG Road"] },
  { name: "Surat", state: "Gujarat", areas: ["Adajan", "Vesu", "Athwa", "Varachha", "Katargam", "Piplod", "Pal", "Ring Road"] },
  { name: "Jaipur", state: "Rajasthan", areas: ["Malviya Nagar", "C-Scheme", "Vaishali Nagar", "Mansarovar", "Tonk Road", "Jagatpura", "Sodala", "Sanganer", "Bani Park"] },
  { name: "Lucknow", state: "Uttar Pradesh", areas: ["Gomti Nagar", "Hazratganj", "Aliganj", "Indira Nagar", "Aminabad", "Alambagh", "Chowk", "Mahanagar"] },
  { name: "Kanpur", state: "Uttar Pradesh", areas: ["Civil Lines", "Swaroop Nagar", "Kakadeo", "Govind Nagar", "Kidwai Nagar", "Mall Road"] },
  { name: "Nagpur", state: "Maharashtra", areas: ["Dharampeth", "Sadar", "Manish Nagar", "Civil Lines", "Wardha Road", "Sitabuldi"] },
  { name: "Indore", state: "Madhya Pradesh", areas: ["Vijay Nagar", "Palasia", "AB Road", "Rajwada", "Bhawarkua", "Sudama Nagar"] },
  { name: "Bhopal", state: "Madhya Pradesh", areas: ["MP Nagar", "Arera Colony", "Shahpura", "Kolar Road", "Habibganj", "New Market"] },
  { name: "Patna", state: "Bihar", areas: ["Boring Road", "Kankarbagh", "Patliputra Colony", "Rajendra Nagar", "Gandhi Maidan", "Bailey Road"] },
  { name: "Chandigarh", state: "Chandigarh", areas: ["Sector 17", "Sector 22", "Sector 35", "Sector 8", "Industrial Area", "Manimajra"] },
  { name: "Gurugram", state: "Haryana", areas: ["Cyber City", "MG Road", "Sohna Road", "Golf Course Road", "Sector 14", "Sector 56", "Udyog Vihar"] },
  { name: "Noida", state: "Uttar Pradesh", areas: ["Sector 18", "Sector 62", "Sector 137", "Greater Noida", "Sector 50", "Sector 76"] },
  { name: "Ghaziabad", state: "Uttar Pradesh", areas: ["Indirapuram", "Vaishali", "Kaushambi", "Raj Nagar", "Vasundhara"] },
  { name: "Faridabad", state: "Haryana", areas: ["NIT", "Sector 15", "Sector 21", "Old Faridabad", "Ballabgarh"] },
  { name: "Coimbatore", state: "Tamil Nadu", areas: ["RS Puram", "Peelamedu", "Saibaba Colony", "Race Course", "Gandhipuram"] },
  { name: "Visakhapatnam", state: "Andhra Pradesh", areas: ["MVP Colony", "Dwaraka Nagar", "Madhurawada", "Gajuwaka", "Beach Road"] },
  { name: "Vijayawada", state: "Andhra Pradesh", areas: ["Benz Circle", "Auto Nagar", "Patamata", "Governorpet", "Mogalrajpuram"] },
  { name: "Kochi", state: "Kerala", areas: ["Marine Drive", "Edappally", "Kakkanad", "Fort Kochi", "Vyttila", "Palarivattom"] },
  { name: "Thiruvananthapuram", state: "Kerala", areas: ["Pattom", "Kowdiar", "Vellayambalam", "Technopark", "Sasthamangalam"] },
  { name: "Mysuru", state: "Karnataka", areas: ["Saraswathipuram", "Vijayanagar", "Gokulam", "Jayalakshmipuram", "Kuvempunagar"] },
  { name: "Ludhiana", state: "Punjab", areas: ["Model Town", "Sarabha Nagar", "Pakhowal Road", "Civil Lines", "Ferozepur Road"] },
  { name: "Amritsar", state: "Punjab", areas: ["Ranjit Avenue", "Lawrence Road", "Mall Road", "Hall Bazar", "Putlighar"] },
  { name: "Agra", state: "Uttar Pradesh", areas: ["Sadar Bazar", "Tajganj", "Dayalbagh", "Kamla Nagar", "Sanjay Place"] },
  { name: "Varanasi", state: "Uttar Pradesh", areas: ["Lanka", "Sigra", "Cantt", "Bhelupur", "Godowlia"] },
  { name: "Meerut", state: "Uttar Pradesh", areas: ["Shastri Nagar", "Civil Lines", "Begum Bagh", "Pallavpuram", "Saket"] },
  { name: "Rajkot", state: "Gujarat", areas: ["University Road", "Race Course", "Kalavad Road", "150 Feet Ring Road"] },
  { name: "Vadodara", state: "Gujarat", areas: ["Alkapuri", "Gotri", "Sayajigunj", "Manjalpur", "Fatehgunj"] },
  { name: "Nashik", state: "Maharashtra", areas: ["College Road", "Gangapur Road", "Indira Nagar", "Panchavati", "CIDCO"] },
  { name: "Aurangabad", state: "Maharashtra", areas: ["CIDCO", "Garkheda", "Jalna Road", "Osmanpura", "Samarth Nagar"] },
  { name: "Ranchi", state: "Jharkhand", areas: ["Lalpur", "Kanke Road", "Doranda", "Harmu", "Main Road"] },
  { name: "Raipur", state: "Chhattisgarh", areas: ["Civil Lines", "Shankar Nagar", "Pandri", "Tatibandh", "Devendra Nagar"] },
  { name: "Guwahati", state: "Assam", areas: ["Beltola", "Zoo Road", "Six Mile", "GS Road", "Paltan Bazar"] },
  { name: "Dehradun", state: "Uttarakhand", areas: ["Rajpur Road", "Sahastradhara Road", "Clement Town", "Race Course"] },
  { name: "Jodhpur", state: "Rajasthan", areas: ["Sardarpura", "Ratanada", "Shastri Nagar", "Paota", "Chopasni Road"] },
  { name: "Udaipur", state: "Rajasthan", areas: ["Hiran Magri", "Sector 11", "Bhuwana", "Sukhadia Circle", "Madhuban"] },
];
