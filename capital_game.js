// This allows the Javascript code inside this block to only run when the page
// has finished loading in the browser.

/* Array for table entries. */
const entries = [];

/* jQuery ajax call */
$.get(
  "https://s3.ap-northeast-2.amazonaws.com/ec2-54-144-69-91.compute-1.amazonaws.com/country_capital_pairs_2019.csv",
)
  .done(response => {
    /* Parse response into javascript array.
     * The result is stored in windows.pairs variable. */
    window.pairs = [];
    const data = response.split("\r\n").slice(1);
    for (let i = 0; i < data.length; i++) {
      const country = data[i].split(",")[0];
      const capital = data[i].split(",")[1];

      window.pairs.push({
        country: country
          .split(" ")
          .map(item => {
            /* Format country name.
             * ex. TAIWAN (REPUBLIC OF CHINA) => Taiwan (Republic of China) */
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
        capital: capital,
      });
    }

    /* Initialize capitals array for newQuestion. */
    const capitals = [];
    for (i = 0; i < window.pairs.length; i++) {
      capitals.push(window.pairs[i].capital);
    }

    /* On document load. */
    $(document).ready(() => {
      /* Bring entries, and load new question. */
      initializeEntries();
      let current_country_capital_pair = newQuestion();

      /* On button click or 'enter' */
      $("#pr2__submit").on("click", () => {
        current_country_capital_pair = checkAnswer(
          current_country_capital_pair,
        );
      });
      $("#pr2__answer").keydown(event => {
        if (event.keyCode === 13) {
          $("#pr2__submit").click();
          $("#pr2__answer").autocomplete("close");
        }
      });

      /* Handle autocomplete click, same as above. */
      $("#pr2__answer").autocomplete({
        source: capitals,
        select: (event, ui) => {
          /* 'enter' is automatically caught on above.
           * Below is for click. */
          if (event.keyCode !== 13) {
            $("#pr2__answer").val(ui.item.value);
            $("#pr2__submit").click();
          }
        },
        close: () => $("#pr2__answer").val(""),
      });

      /* Delete entry. */
      $(document).on("click", ".delete", event => deleteEntry(event.target));

      /* Clear entries. */
      $("#pr3__clear").on("click", () => clearEntries());

      /* Filtering with radio. */
      $("input[type=radio][name=filter]").change(() => {
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
    });
  })
  .fail(error => {
    alert("Could not retrieve country-capital pairs file!");
    console.error({ error });
  });

/* ======================== Functions ======================== */
/**
 * newQuestion: clear input, show new question.
 * @return {json} country-capital pair.
 */
function newQuestion() {
  const country_capital_pair =
    window.pairs[Math.floor(Math.random() * window.pairs.length)];

  $("#pr2__question").html(country_capital_pair.country);
  $("#pr2__answer").val("").focus();
  return country_capital_pair;
}

/**
 * checkAnswer: check the input answer and insert to the list below.
 * @param {json} current_country_capital_pair
 * @return {json} new country-capital pair.
 */
function checkAnswer(current_country_capital_pair) {
  const country = current_country_capital_pair.country;
  const capital = current_country_capital_pair.capital;
  const myAnswer = $("#pr2__answer").val();

  /* Check answer. */
  const correct = myAnswer.toLowerCase() === capital.toLowerCase();
  const correctToString = correct ? "correct" : "wrong";
  /**
   * Reset filter to 'All',
   * if current filter does not contain new entry.
   */
  const currentFilter = $("input[name=filter]").filter(":checked").val();
  if (currentFilter !== "All" && currentFilter !== correctToString) {
    $("input[value=all]").prop("checked", true);
    $("tr").show();
  }
  /* Push to entries, and insert HTML. */
  pushEntry({
    correct,
    country,
    capital: correct ? capital : myAnswer,
  });

  /* Reset with new question. */
  return newQuestion();
}

/**
 * pushEntry: push current entry.
 * @param {Boolean} correct
 * @param {String} country
 * @param {String} capital If correct, capital. Otherwise, myAnswer.
 */
function pushEntry({ correct, country, capital }) {
  pushEntryHTML({ correct, country, capital });

  /* Update entries, and database. */
  entries.push({
    correct: correct,
    country: country,
    capital: capital,
  });
  writeToDatabase(entries);
}

/**
 * pushEntryHTML: insert HTML Elements.
 * @params equal to above.
 */
function pushEntryHTML({ correct, country, capital }) {
  const correctToString = correct ? "correct" : "wrong";

  /* Insert HTML Element. */
  $("tr#filter").after(
    `<tr class="entry ${correctToString}">
      <td class="country">${country}</td>
      ${
        correct
          ? `<td class="capital">${capital}</td>`
          : `<td id="wrong" class="capital">
            <strike>${capital}</strike>
          </td>`
      }
      <td id="delete_button"> 
        ${capital}
        <button class="delete">delete</button>
      </td>
    </tr>`,
  );
}

/**
 * deleteEntry: delete current entry.
 * @param {HTMLElement} target delete button
 */
function deleteEntry(target) {
  const entryElement = target.parentElement.parentElement;
  const index = entries.length - 1 - (entryElement.rowIndex - 3);

  /* Remove HTML Element. */
  entryElement.remove();

  /* Update entries, and database. */
  entries.splice(index, 1);
  writeToDatabase(entries);
}

/**
 * initializeEntries: initialize entries with database.
 */
function initializeEntries() {
  const promise = readFromDatabase();
  promise
    .then(res => {
      const history = res.val();
      for (key in history) {
        const hasEntries = history[key].entries;
        if (hasEntries) {
          entries.splice(0, entries.length, ...hasEntries);
          entries.forEach(entry => pushEntryHTML(entry));
        }
      }
    })
    .catch(err => console.error(err));
}

/**
 * clearEntries: clear all entries.
 */
function clearEntries() {
  /* Remove HTML Elements. */
  $(".entry").remove();

  /* Update entries, and database. */
  entries.splice(0, entries.length);
  writeToDatabase(entries);
}

/* =========================================================== */

/* ======================== Database ========================= */
const databaseRef = firebase.database().ref("history");
// Refer to https://firebase.google.com/docs/reference/js/firebase.database.Reference

/**
 * readFromDatabase: get pairs from database.
 * @return {Promise} snapshot of most recent database.
 */
function readFromDatabase() {
  databaseRef.orderByChild("timestamp");
  return databaseRef.limitToLast(1).once("value");
}

/**
 * writeToDatabase: push timestamp with pairs to database.
 * @param {Array} entries list of country-capital pair.
 */
function writeToDatabase(entries) {
  const newKey = databaseRef.push();
  const entriesObject = {};
  entries.forEach((entry, index) => {
    entriesObject[index] = entry;
  });
  newKey.set({
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    entries: entriesObject,
  });
}
/* =========================================================== */
