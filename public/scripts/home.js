poke_id = null;
poke_name = null;
pokemons = [];

const colors = {
    fire: "#FDDFDF",
    grass: "#DEFDE0",
    electric: "#FCF7DE",
    water: "#DEF3FD",
    ground: "#f4e7da",
    rock: "#d5d5d4",
    fairy: "#fceaff",
    poison: "#98d7a5",
    bug: "#f8d5a3",
    dragon: "#97b3e6",
    psychic: "#eceda1",
    flying: "#F5F5F5",
    fighting: "#E6E0D4",
    normal: "#F5F5F5",
}

async function display_all_picture() {
  result = "";
  for (i = 0; i < 3; i++) {
    result += "<div class='images_group'>";
    for (j = 0; j < 3; j++) {
      poke_id = Math.floor(Math.random() * 600 + 1);
      await $.ajax({
        url: `https://pokeapi.co/api/v2/pokemon/${poke_id}`,
        type: "GET",
        success: function process(data) {
          allowed = data.types[0].type.name;
          obj_colors = Object.keys(colors).filter((key) =>
            allowed.includes(key)
          );
          color_code = colors[obj_colors];
          poke_name = data.name;
          result += `<div class="image_container" style="background:linear-gradient(45deg, ${color_code[0]}, ${color_code[1]});"> <a href='profile/${poke_id}' id= ${poke_id}>
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke_id}.png">
                        </img>
                        </a>
                        <div class='card_header'>
                        <div class='poke__number'>
                        #${poke_id}
                        </div>
                        </div>
                        <div>${poke_name}</div>
                        </div>`;
        },
      });
    }

    result += "</div>";
  }
  $("main").html(result);
}

const d = new Date();
var now = new Date(Date.now());
let time = d.toLocaleDateString() + " " + now.getHours() + ":" + now.getMinutes();

function insertSearchEventToTheTimeLine(poke_ID) {
    $.ajax({
        url: "https://dry-waters-76801.herokuapp.com/timeline/insert",
        type: "put",
        data: {
            text: ` Client has clicked the #${poke_ID} card`,
            time: `${time}`,
            hits: 1
        },
        success: function (r) {
            console.log("Timeline event added" + r)
        }
    })
}

$(document).ready(function () {
  display_all_picture();

  $("body").on("click", "a", async function () {
    var poke_ID = $(this).attr("id");
    await $.ajax({
      url: `https://pokeapi.co/api/v2/pokemon/${poke_ID}`,
      type: "get",
      success: function (data) {
        console.log(data.species.name)
        insertSearchEventToTheTimeLine(data.species.name);
      },
    });
  });
});