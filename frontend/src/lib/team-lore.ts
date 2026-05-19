/**
 * Curated team lore - head coach, retired jerseys (Ring of Honor / Hall of Fame),
 * and identity notes (relocations, name changes). This is hand-maintained because
 * `nba_api` doesn't expose any of it cleanly. Names match NBA Stats spelling so
 * the player slugs link up.
 *
 * Updated 2026-05-15 for the 2025-26 season. Coaches change often; expect drift.
 */

export interface TeamLore {
  head_coach?: string;
  /** Players whose jerseys the franchise has retired (sorted by number). */
  retired_jerseys?: { number: string; name: string; slug?: string }[];
  /** Short identity blurb - relocations, name changes, era notes. */
  notes?: string;
}

export const TEAM_LORE: Record<string, TeamLore> = {
  ATL: {
    head_coach: "Quin Snyder",
    notes:
      "Founded as the Tri-Cities Blackhawks (1946), moved to Milwaukee, then St. Louis, then Atlanta in 1968. Two-time NBA champions (1958 as St. Louis).",
    retired_jerseys: [
      { number: "9", name: "Bob Pettit", slug: "bob-pettit" },
      { number: "21", name: "Dominique Wilkins", slug: "dominique-wilkins" },
      { number: "23", name: "Lou Hudson", slug: "lou-hudson" },
      { number: "44", name: "Pete Maravich", slug: "pete-maravich" },
      { number: "55", name: "Dikembe Mutombo", slug: "dikembe-mutombo" },
    ],
  },
  BOS: {
    head_coach: "Joe Mazzulla",
    notes:
      "Founded 1946 - the NBA's most decorated franchise with 18 championships. Eight straight titles 1959-1966 under Red Auerbach.",
    retired_jerseys: [
      { number: "00", name: "Robert Parish", slug: "robert-parish" },
      { number: "6", name: "Bill Russell", slug: "bill-russell" },
      { number: "10", name: "Jo Jo White", slug: "jo-jo-white" },
      { number: "14", name: "Bob Cousy", slug: "bob-cousy" },
      { number: "15", name: "Tom Heinsohn", slug: "tom-heinsohn" },
      { number: "16", name: "Tom Sanders", slug: "tom-sanders" },
      { number: "17", name: "John Havlicek", slug: "john-havlicek" },
      { number: "18", name: "Dave Cowens", slug: "dave-cowens" },
      { number: "19", name: "Don Nelson", slug: "don-nelson" },
      { number: "20", name: "Ray Allen", slug: "ray-allen" },
      { number: "21", name: "Bill Sharman", slug: "bill-sharman" },
      { number: "22", name: "Ed Macauley", slug: "ed-macauley" },
      { number: "23", name: "Frank Ramsey", slug: "frank-ramsey" },
      { number: "24", name: "Sam Jones", slug: "sam-jones" },
      { number: "25", name: "K.C. Jones", slug: "kc-jones" },
      { number: "31", name: "Cedric Maxwell", slug: "cedric-maxwell" },
      { number: "32", name: "Kevin McHale", slug: "kevin-mchale" },
      { number: "33", name: "Larry Bird", slug: "larry-bird" },
      { number: "34", name: "Paul Pierce", slug: "paul-pierce" },
      { number: "35", name: "Reggie Lewis", slug: "reggie-lewis" },
    ],
  },
  BKN: {
    head_coach: "Jordi Fernández",
    notes:
      "Originally the New Jersey Americans (ABA, 1967), then New York Nets, then New Jersey Nets, then Brooklyn Nets in 2012. Two ABA championships (1974, 1976) with Julius Erving.",
    retired_jerseys: [
      { number: "3", name: "Drazen Petrović", slug: "drazen-petrovic" },
      { number: "5", name: "Jason Kidd", slug: "jason-kidd" },
      { number: "23", name: "John Williamson", slug: "john-williamson" },
      { number: "25", name: "Bill Melchionni", slug: "bill-melchionni" },
      { number: "32", name: "Julius Erving", slug: "julius-erving" },
      { number: "52", name: "Buck Williams", slug: "buck-williams" },
    ],
  },
  CHA: {
    head_coach: "Charles Lee",
    notes:
      "The current Hornets are the second Charlotte franchise - the first became the New Orleans Pelicans. Began 2004 as the Bobcats, renamed Hornets in 2014.",
    retired_jerseys: [{ number: "13", name: "Bobby Phills", slug: "bobby-phills" }],
  },
  CHI: {
    head_coach: "Billy Donovan",
    notes:
      "Founded 1966. Six championships in the 1990s under Phil Jackson with Michael Jordan and Scottie Pippen. Won 72 games in 1995-96, then a record 73 in Golden State's 2015-16.",
    retired_jerseys: [
      { number: "1", name: "Derrick Rose", slug: "derrick-rose" },
      { number: "4", name: "Jerry Sloan", slug: "jerry-sloan" },
      { number: "10", name: "Bob Love", slug: "bob-love" },
      { number: "23", name: "Michael Jordan", slug: "michael-jordan" },
      { number: "33", name: "Scottie Pippen", slug: "scottie-pippen" },
    ],
  },
  CLE: {
    head_coach: "Kenny Atkinson",
    notes:
      "Founded 1970. One championship (2016) - LeBron James returning home and overcoming a 3-1 Finals deficit against the 73-win Warriors.",
    retired_jerseys: [
      { number: "7", name: "Bingo Smith", slug: "bingo-smith" },
      { number: "11", name: "Zydrunas Ilgauskas", slug: "zydrunas-ilgauskas" },
      { number: "22", name: "Larry Nance", slug: "larry-nance" },
      { number: "25", name: "Mark Price", slug: "mark-price" },
      { number: "34", name: "Austin Carr", slug: "austin-carr" },
      { number: "42", name: "Nate Thurmond", slug: "nate-thurmond" },
      { number: "43", name: "Brad Daugherty", slug: "brad-daugherty" },
    ],
  },
  DAL: {
    head_coach: "Jason Kidd",
    notes:
      "Founded 1980. One championship (2011) with Dirk Nowitzki avenging the 2006 Finals loss to Miami.",
    retired_jerseys: [
      { number: "12", name: "Derek Harper", slug: "derek-harper" },
      { number: "15", name: "Brad Davis", slug: "brad-davis" },
      { number: "22", name: "Rolando Blackman", slug: "rolando-blackman" },
      { number: "41", name: "Dirk Nowitzki", slug: "dirk-nowitzki" },
    ],
  },
  DEN: {
    head_coach: "David Adelman",
    notes:
      "Founded as the Denver Rockets (ABA, 1967), renamed Nuggets in 1974. One NBA championship (2023) with Nikola Jokić.",
    retired_jerseys: [
      { number: "2", name: "Alex English", slug: "alex-english" },
      { number: "12", name: "Fat Lever", slug: "lafayette-lever" },
      { number: "33", name: "David Thompson", slug: "david-thompson" },
      { number: "40", name: "Byron Beck", slug: "byron-beck" },
      { number: "44", name: "Dan Issel", slug: "dan-issel" },
      { number: "55", name: "Dikembe Mutombo", slug: "dikembe-mutombo" },
    ],
  },
  DET: {
    head_coach: "J.B. Bickerstaff",
    notes:
      "Founded as the Fort Wayne Pistons (1941), moved to Detroit in 1957. Three championships (1989, 1990, 2004). Bad Boys era + 2004 with no superstars.",
    retired_jerseys: [
      { number: "1", name: "Chauncey Billups", slug: "chauncey-billups" },
      { number: "2", name: "Chuck Daly" },
      { number: "3", name: "Ben Wallace", slug: "ben-wallace" },
      { number: "4", name: "Joe Dumars", slug: "joe-dumars" },
      { number: "10", name: "Dennis Rodman", slug: "dennis-rodman" },
      { number: "11", name: "Isiah Thomas", slug: "isiah-thomas" },
      { number: "15", name: "Vinnie Johnson", slug: "vinnie-johnson" },
      { number: "16", name: "Bob Lanier", slug: "bob-lanier" },
      { number: "21", name: "Dave Bing", slug: "dave-bing" },
      { number: "32", name: "Richard Hamilton", slug: "richard-hamilton" },
      { number: "40", name: "Bill Laimbeer", slug: "bill-laimbeer" },
    ],
  },
  GSW: {
    head_coach: "Steve Kerr",
    notes:
      "Founded as the Philadelphia Warriors (1946), moved to San Francisco (1962), then Golden State (1971). Seven championships, four of them in the Curry / Thompson / Green / Iguodala dynasty (2015, 2017, 2018, 2022).",
    retired_jerseys: [
      { number: "13", name: "Wilt Chamberlain", slug: "wilt-chamberlain" },
      { number: "14", name: "Tom Meschery" },
      { number: "16", name: "Al Attles" },
      { number: "17", name: "Chris Mullin", slug: "chris-mullin" },
      { number: "24", name: "Rick Barry", slug: "rick-barry" },
      { number: "42", name: "Nate Thurmond", slug: "nate-thurmond" },
    ],
  },
  HOU: {
    head_coach: "Ime Udoka",
    notes:
      "Founded as the San Diego Rockets (1967), moved to Houston in 1971. Two championships (1994, 1995) led by Hakeem Olajuwon during Jordan's first retirement.",
    retired_jerseys: [
      { number: "11", name: "Yao Ming", slug: "yao-ming" },
      { number: "22", name: "Clyde Drexler", slug: "clyde-drexler" },
      { number: "23", name: "Calvin Murphy", slug: "calvin-murphy" },
      { number: "24", name: "Moses Malone", slug: "moses-malone" },
      { number: "34", name: "Hakeem Olajuwon", slug: "hakeem-olajuwon" },
      { number: "45", name: "Rudy Tomjanovich" },
    ],
  },
  IND: {
    head_coach: "Rick Carlisle",
    notes:
      "Founded ABA 1967, three ABA championships before joining NBA in 1976. Pacers reached the 2000 and 2024 NBA Finals but no title.",
    retired_jerseys: [
      { number: "30", name: "George McGinnis", slug: "george-mcginnis" },
      { number: "31", name: "Reggie Miller", slug: "reggie-miller" },
      { number: "34", name: "Mel Daniels" },
      { number: "35", name: "Roger Brown" },
      { number: "529", name: "Bob 'Slick' Leonard" },
    ],
  },
  LAC: {
    head_coach: "Tyronn Lue",
    notes:
      "Founded as the Buffalo Braves (1970), moved to San Diego (1978), then Los Angeles (1984). First NBA-championship-less franchise from the 1970 expansion class.",
    retired_jerseys: [
      { number: "32", name: "Bob McAdoo", slug: "bob-mcadoo" },
      { number: "53", name: "Darrell Imhoff" },
    ],
  },
  LAL: {
    head_coach: "JJ Redick",
    notes:
      "Founded as the Minneapolis Lakers (1947), moved to Los Angeles in 1960. 17 championships - tied with Boston. Defined by Magic-Kareem 80s, Shaq-Kobe 2000s, and LeBron-AD 2020.",
    retired_jerseys: [
      { number: "8", name: "Kobe Bryant", slug: "kobe-bryant" },
      { number: "13", name: "Wilt Chamberlain", slug: "wilt-chamberlain" },
      { number: "16", name: "Pau Gasol", slug: "pau-gasol" },
      { number: "22", name: "Elgin Baylor", slug: "elgin-baylor" },
      { number: "24", name: "Kobe Bryant", slug: "kobe-bryant" },
      { number: "25", name: "Gail Goodrich", slug: "gail-goodrich" },
      { number: "32", name: "Magic Johnson", slug: "magic-johnson" },
      { number: "33", name: "Kareem Abdul-Jabbar", slug: "kareem-abdul-jabbar" },
      { number: "34", name: "Shaquille O'Neal", slug: "shaquille-oneal" },
      { number: "42", name: "James Worthy", slug: "james-worthy" },
      { number: "44", name: "Jerry West", slug: "jerry-west" },
      { number: "52", name: "Jamaal Wilkes", slug: "jamaal-wilkes" },
      { number: "99", name: "Chick Hearn (broadcaster)" },
    ],
  },
  MEM: {
    head_coach: "Tuomas Iisalo",
    notes:
      "Founded as the Vancouver Grizzlies (1995), moved to Memphis in 2001. Grit-and-Grind era reached 2013 Conference Finals.",
    retired_jerseys: [
      { number: "9", name: "Tony Allen", slug: "tony-allen" },
      { number: "33", name: "Marc Gasol", slug: "marc-gasol" },
      { number: "50", name: "Zach Randolph", slug: "zach-randolph" },
    ],
  },
  MIA: {
    head_coach: "Erik Spoelstra",
    notes:
      "Founded 1988. Three championships (2006 with Wade-Shaq; 2012, 2013 with LeBron-Wade-Bosh).",
    retired_jerseys: [
      { number: "1", name: "Chris Bosh", slug: "chris-bosh" },
      { number: "3", name: "Dwyane Wade", slug: "dwyane-wade" },
      { number: "10", name: "Tim Hardaway", slug: "tim-hardaway" },
      { number: "23", name: "Michael Jordan", slug: "michael-jordan" },
      { number: "32", name: "Shaquille O'Neal", slug: "shaquille-oneal" },
      { number: "33", name: "Alonzo Mourning", slug: "alonzo-mourning" },
    ],
  },
  MIL: {
    head_coach: "Doc Rivers",
    notes:
      "Founded 1968. Two championships - Kareem-Oscar 1971 and Giannis-Middleton 2021.",
    retired_jerseys: [
      { number: "1", name: "Oscar Robertson", slug: "oscar-robertson" },
      { number: "2", name: "Junior Bridgeman" },
      { number: "4", name: "Sidney Moncrief", slug: "sidney-moncrief" },
      { number: "8", name: "Marques Johnson", slug: "marques-johnson" },
      { number: "10", name: "Bob Dandridge", slug: "bob-dandridge" },
      { number: "14", name: "Jon McGlocklin" },
      { number: "16", name: "Bob Lanier", slug: "bob-lanier" },
      { number: "32", name: "Brian Winters" },
      { number: "33", name: "Kareem Abdul-Jabbar", slug: "kareem-abdul-jabbar" },
    ],
  },
  MIN: {
    head_coach: "Chris Finch",
    notes:
      "Founded 1989. Reached 2024 Conference Finals - first deep playoff run since the 2004 Garnett-led team.",
    retired_jerseys: [
      { number: "2", name: "Malik Sealy" },
    ],
  },
  NOP: {
    head_coach: "Willie Green",
    notes:
      "Founded as the Charlotte Hornets (1988), moved to New Orleans in 2002, briefly the New Orleans/Oklahoma City Hornets (2005-07), then renamed Pelicans in 2013.",
    retired_jerseys: [
      { number: "7", name: "Pete Maravich", slug: "pete-maravich" },
    ],
  },
  NYK: {
    head_coach: "Mike Brown",
    notes:
      "Founded 1946 as a charter NBA franchise. Two championships (1970, 1973). Madison Square Garden remains the league's signature venue.",
    retired_jerseys: [
      { number: "10", name: "Walt Frazier", slug: "walt-frazier" },
      { number: "12", name: "Dick Barnett" },
      { number: "15", name: "Earl Monroe", slug: "earl-monroe" },
      { number: "15", name: "Dick McGuire" },
      { number: "19", name: "Willis Reed", slug: "willis-reed" },
      { number: "22", name: "Dave DeBusschere", slug: "dave-debusschere" },
      { number: "24", name: "Bill Bradley", slug: "bill-bradley" },
      { number: "33", name: "Patrick Ewing", slug: "patrick-ewing" },
      { number: "613", name: "Red Holzman (coach)" },
    ],
  },
  OKC: {
    head_coach: "Mark Daigneault",
    notes:
      "Founded as the Seattle SuperSonics (1967), moved to Oklahoma City in 2008. One title (1979 in Seattle, never recognized as OKC). 2025 NBA champions.",
    retired_jerseys: [
      { number: "1", name: "Gus Williams" },
      { number: "10", name: "Nate McMillan" },
      { number: "19", name: "Lenny Wilkens" },
      { number: "24", name: "Spencer Haywood", slug: "spencer-haywood" },
      { number: "32", name: "Fred Brown" },
      { number: "43", name: "Jack Sikma" },
    ],
  },
  ORL: {
    head_coach: "Jamahl Mosley",
    notes:
      "Founded 1989. Two Finals appearances (1995 with Shaq, 2009 with Howard) - no championships.",
    retired_jerseys: [{ number: "6", name: "The Fans" }],
  },
  PHI: {
    head_coach: "Nick Nurse",
    notes:
      "Founded as the Syracuse Nationals (1946), moved to Philadelphia in 1963. Three championships - 1955 (Syracuse), 1967 (Chamberlain), 1983 (Dr. J / Moses Malone).",
    retired_jerseys: [
      { number: "3", name: "Allen Iverson", slug: "allen-iverson" },
      { number: "6", name: "Julius Erving", slug: "julius-erving" },
      { number: "10", name: "Maurice Cheeks", slug: "maurice-cheeks" },
      { number: "13", name: "Wilt Chamberlain", slug: "wilt-chamberlain" },
      { number: "15", name: "Hal Greer", slug: "hal-greer" },
      { number: "24", name: "Bobby Jones" },
      { number: "32", name: "Charles Barkley", slug: "charles-barkley" },
      { number: "34", name: "Charles Barkley", slug: "charles-barkley" },
      { number: "6", name: "Dolph Schayes" },
    ],
  },
  PHX: {
    head_coach: "Jordan Ott",
    notes:
      "Founded 1968. Three Finals appearances (1976, 1993, 2021) - no championships. Seven Seconds or Less era under D'Antoni and Nash.",
    retired_jerseys: [
      { number: "5", name: "Dick Van Arsdale" },
      { number: "6", name: "Walter Davis" },
      { number: "7", name: "Kevin Johnson", slug: "kevin-johnson" },
      { number: "9", name: "Dan Majerle" },
      { number: "13", name: "Steve Nash", slug: "steve-nash" },
      { number: "24", name: "Tom Chambers" },
      { number: "33", name: "Alvan Adams" },
      { number: "34", name: "Charles Barkley", slug: "charles-barkley" },
      { number: "42", name: "Connie Hawkins" },
      { number: "44", name: "Paul Westphal" },
    ],
  },
  POR: {
    head_coach: "Tiago Splitter",
    notes:
      "Founded 1970. One championship (1977) with Bill Walton. Closest since: 1990 and 1992 Finals losses to Detroit and Chicago.",
    retired_jerseys: [
      { number: "1", name: "Larry Weinberg (owner)" },
      { number: "13", name: "Dave Twardzik" },
      { number: "14", name: "Lionel Hollins" },
      { number: "15", name: "Larry Steele" },
      { number: "20", name: "Maurice Lucas" },
      { number: "22", name: "Clyde Drexler", slug: "clyde-drexler" },
      { number: "30", name: "Terry Porter" },
      { number: "32", name: "Bill Walton", slug: "bill-walton" },
      { number: "36", name: "Lloyd Neal" },
      { number: "45", name: "Geoff Petrie" },
      { number: "77", name: "Jack Ramsay (coach)" },
    ],
  },
  SAC: {
    head_coach: "Doug Christie",
    notes:
      "Founded as the Rochester Royals (1945), then Cincinnati, Kansas City–Omaha, Kansas City, finally Sacramento in 1985. One championship (1951 as Rochester).",
    retired_jerseys: [
      { number: "1", name: "Nate Archibald" },
      { number: "2", name: "Mitch Richmond", slug: "mitch-richmond" },
      { number: "4", name: "Chris Webber", slug: "chris-webber" },
      { number: "6", name: "The Fans" },
      { number: "11", name: "Bob Davies" },
      { number: "12", name: "Maurice Stokes" },
      { number: "14", name: "Oscar Robertson", slug: "oscar-robertson" },
      { number: "16", name: "Peja Stojakovic", slug: "peja-stojakovic" },
      { number: "21", name: "Vlade Divac", slug: "vlade-divac" },
      { number: "27", name: "Jack Twyman" },
      { number: "44", name: "Sam Lacey" },
    ],
  },
  SAS: {
    head_coach: "Mitch Johnson",
    notes:
      "Founded as the Dallas Chaparrals (ABA, 1967), moved to San Antonio in 1973. Five championships under Gregg Popovich with Duncan, Parker, and Ginóbili.",
    retired_jerseys: [
      { number: "00", name: "Johnny Moore" },
      { number: "6", name: "Avery Johnson", slug: "avery-johnson" },
      { number: "9", name: "Tony Parker", slug: "tony-parker" },
      { number: "12", name: "Bruce Bowen", slug: "bruce-bowen" },
      { number: "13", name: "James Silas" },
      { number: "20", name: "Manu Ginóbili", slug: "manu-ginobili" },
      { number: "21", name: "Tim Duncan", slug: "tim-duncan" },
      { number: "32", name: "Sean Elliott", slug: "sean-elliott" },
      { number: "44", name: "George Gervin", slug: "george-gervin" },
      { number: "50", name: "David Robinson", slug: "david-robinson" },
    ],
  },
  TOR: {
    head_coach: "Darko Rajaković",
    notes:
      "Founded 1995. One championship (2019) with Kawhi Leonard's one-year stint. Only non-US-based franchise.",
    retired_jerseys: [
      { number: "15", name: "Vince Carter", slug: "vince-carter" },
    ],
  },
  UTA: {
    head_coach: "Will Hardy",
    notes:
      "Founded as the New Orleans Jazz (1974), moved to Utah in 1979. Two Finals losses to Chicago (1997, 1998) with Stockton and Malone.",
    retired_jerseys: [
      { number: "1", name: "Frank Layden (coach)" },
      { number: "4", name: "Adrian Dantley", slug: "adrian-dantley" },
      { number: "7", name: "Pete Maravich", slug: "pete-maravich" },
      { number: "9", name: "Larry H. Miller (owner)" },
      { number: "12", name: "John Stockton", slug: "john-stockton" },
      { number: "14", name: "Jeff Hornacek", slug: "jeff-hornacek" },
      { number: "32", name: "Karl Malone", slug: "karl-malone" },
      { number: "35", name: "Darrell Griffith" },
      { number: "53", name: "Mark Eaton" },
    ],
  },
  WAS: {
    head_coach: "Brian Keefe",
    notes:
      "Founded as the Chicago Packers (1961), then Zephyrs, Baltimore Bullets, Capital Bullets, Washington Bullets - renamed Wizards in 1997. One championship (1978).",
    retired_jerseys: [
      { number: "10", name: "Earl Monroe", slug: "earl-monroe" },
      { number: "11", name: "Elvin Hayes", slug: "elvin-hayes" },
      { number: "25", name: "Gus Johnson" },
      { number: "41", name: "Wes Unseld", slug: "wes-unseld" },
      { number: "45", name: "Phil Chenier" },
    ],
  },
};
