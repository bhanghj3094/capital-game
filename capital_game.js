// This allows the Javascript code inside this block to only run when the page
// has finished loading in the browser.

// request for country, capital pair
$.ajax(
  "https://s3.ap-northeast-2.amazonaws.com/ec2-54-144-69-91.compute-1.amazonaws.com/country_capital_pairs_2019.csv"
)
  .done(response => {
    /**
     * Parse response into javascript array.
     * The result is stored in windows.pairs variable.
     */
    window.pairs = [];
    const data = response.split("\n").slice(1);
    for (let i = 0; i < data.length; i++) {
      const country = data[i].split(",")[0];
      const capital = data[i].split(",")[1];

      pairs.push({
        country: country
          .split(" ")
          .map(item => {
            if (["and", "of", "the"].includes(item.toLowerCase())) {
              return item.toLowerCase();
            } else if (item.startsWith("(")) {
              return (
                item.charAt(0) +
                item.charAt(1).toUpperCase() +
                item.slice(2).toLowerCase()
              );
            }
            return item.charAt(0).toUpperCase() + item.slice(1).toLowerCase();
          })
          .join(" "),
        capital: capital
      });
    }

    /**
     * Get only capitals array for autocompletion.
     */
    let current_country_capital_pair = {};
    const capitals = []; // Array for only capitals
    for (i = 0; i < window.pairs.length; i++) {
      capitals.push(window.pairs[i].capital);
    }

    $(document).ready(function () {
      // '$' is the value given for the jQuery library when it loads up.
      // on Page Load
      current_country_capital_pair = newQuestion();

      // enter 혹은 버튼을 눌렀을 때
      $("#pr2__submit").on("click", () => {
        checkAnswer(current_country_capital_pair);
      });
      $("#pr2__answer").keydown(function (event) {
        if (event.keyCode === 13) {
          $("#pr2__submit").click();
          $("#pr2__answer").autocomplete("close");
        }
      });

      // Autocomplete 에서 enter 혹은 눌렀을 때, 위와 동일
      $("#pr2__answer").autocomplete({
        source: capitals,
        select: function (event, ui) {
          // enter 는 위의 keyup 으로, click 은 pr2__submit 으로 위임
          if (event.keyCode === 13) {
          } else {
            // input 의 value 를 선택(click or enter)로 바꿈
            $("#pr2__answer").val(ui.item.value);
            $("#pr2__submit").click();
          }
        },
        close: function (event, ui) {
          $("#pr2__answer").val("");
        }
      });

      // filtering with radio
      $("input[type=radio][name=filter]").change(function () {
        const filtering = this.value;
        switch (filtering) {
          case "all":
            $("tr").show();
            break;
          case "correct":
            $("tr.wrong").hide();
            $("tr.correct").show();
            break;
          default:
            // wrong
            $("tr.correct").hide();
            $("tr.wrong").show();
        }
      });

      /* =========================================================== */
      /* ======================== Functions ======================== */
      /* =========================================================== */
      /*
       * newQuestion: country 를 불러오고, input 을 초기화한다.
       */
      function newQuestion() {
        // 임의의 국가를 불러온다.
        const country_capital_pair =
          window.pairs[Math.floor(Math.random() * window.pairs.length)];
        $("#pr2__question").html(country_capital_pair.country);

        // input 에 자동으로 cursor blinking.
        $("#pr2__answer")
          .val("")
          .focus();

        current_country_capital_pair = country_capital_pair;
        return country_capital_pair;
      }

      /*
       * checkAnswer: check the input answer and insert to the list below.
       */
      function checkAnswer(current_country_capital_pair) {
        // alert('Checking Answer..!');
        const country = current_country_capital_pair.country;
        const capital = current_country_capital_pair.capital;
        const myAnswer = $("#pr2__answer").val();

        // check if correct
        const correct =
          myAnswer.toLowerCase() === capital.toLowerCase() ? true : false;
        if (correct) {
          // change to "All", if the filter was wrong
          if (
            $("input[name=filter]")
              .filter(":checked")
              .val() === "wrong"
          ) {
            $("input[value=all]").prop("checked", true);
            $("tr").show();
          }
          // alert("Correct Answer!");
          $("tr#filter").after(`<tr class="correct">
          <td>${country}</td>
          <td>${capital}</td>
          <td id="delete_button">
            <i class="fas fa-check"></i>
            <button class="delete">delete</button>
          </td>
        </tr>`);
        } else {
          // change to "All", if the filter was correct
          if (
            $("input[name=filter]")
              .filter(":checked")
              .val() === "correct"
          ) {
            $("input[value=all]").prop("checked", true);
            $("tr").show();
          }
          // alert("Wrong Answer!");
          $("tr#filter").after(`<tr class="wrong">
          <td>${country}</td>
          <td id="wrong"><strike>${myAnswer}</strike></td>
          <td id="delete_button">
            ${capital}
            <button class="delete">delete</button>
          </td>
        </tr>`);
        }

        // reset with a new question
        newQuestion();
      }

      /* =========================================================== */
    });

    // on Button Press => ajax 로 안에 넣을 수 없다.
    $(document).on("click", ".delete", function () {
      // alert("in the delete!");
      this.closest("tr").remove();
    });
  })
  .fail(error => {
    alert("Could not retrieve country-capital pairs file!");
  });
