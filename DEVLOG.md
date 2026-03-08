# guestbook-api

**9 march 2026**

## what i built

> its an in-memory guestbook api that i've built with elysia + bun, deployed on [railway](https://guestbook-api-production.up.railway.app/)

## time spent

13 hrs 23 mins via [codetime](https://codetime.dev/en/)

## what i learned

- **custom error classes 101**:
  - instead of the usual way throwing an error like this:
  - ```typescript
    .delete(
      '/:id', () => {
        // ....

        if (remainingTask.length === tasks.length) {
          set.status = 404;
          throw new Error('Task not found!');
        }});
    ```
  - you can simplify the `error throwing` and following a much recommended way with a separation of concern.
  - ```typescript
    .delete(
      '/:id',
      async ({ params }) => {
        const index = messages.findIndex(msg => msg.id === params.id);

        if (index === -1) {
          throw new MessageNotFoundError();
        }
    ```
  - see how simple that is? you're basically packaging the `set.status = 404;` alongside the error message. so the only thing you're bothering is just calling the error classes. 
  - the class owns the status code, `instanceof` is just how you identify which class you're dealing with at the catch site.
  - you're also only changing the classes and its `constructor()` if you ever change your error message response.
  - all in one place. the [index2.ts](/index2.ts) and [index.ts](/index.ts) should be enough example that i don't to write the full workflow here.
- a specific problem this project introduces that i didn't know was **janitor/cleanup interval**.
  - your rate limiting must've stored a unique ip somewhere, which was why `lastRequestTime` used here.
  - every new ip that hits your endpoint, adds an entry.
  -  if your api runs for weeks and gets hit by thousands of different ips, that `Map` just keeps growing in memory forever. it's a slow memory leak.
  - `setInterval` fixes it by running a cleanup function on a timer:
  - ```typescript
    setInterval(() => {
    const cutoff = Date.now() - CLEANUP_INTERVAL_MS;
    for (const [ip, now] of lastRequestTime) {
      if (now < cutoff) lastRequestTime.delete(ip);
    }
    }, CLEANUP_INTERVAL_MS);
    ```

- **service class**
  - previously, this is how i usually define a data layer.
  - ```typescript
    const getTasks = async (): Promise<Task[]> => { ... }
    const saveTasks = async (tasks: Task[]) => { ... }
    ```
  
  - the problem with this is that:
    - nothing owned the data, 
    - nothing controlled access to it.
  - now, you can bundled the data and the operations that touch it into one class:
  - ```typescript
    export class MessageGroupService {
      private messages: Message[] = []; // the data lives HERE, inside the class

      add(name: string, text: string) { ... }    // only way to add
      getAll() { ... }                           // only way to read
      remove(id: string) { ... }                // only way to delete
    }
    ```
  
  - with `private messages`, nothing outside the class can touch that array directly.
  - the only way in is through `add()`, `getAll()`, `remove()`. the class owns the data and controls what you can do with it.
  - with the `add()` constructor, you can actually just use `return group.add(params1, params2)` in your POST endpoint if your `add()` constructor support returning message already.
  - the payoff shows up in the tests. because the data is encapsulated in an instance, you can just do this:
  - ```typescript
    beforeEach(() => {
      testApp = buildMessageApp(new MessageGroupService()); // fresh instance, empty array
    });
    ```

  - instead of the usual way like this:
  - ```typescript
    beforeEach(() => {
        messages.length = 0;
      });
    ```

- you should add `readonly` to your private constructor. 
- if a class has a field that’s not marked `readonly` but is only set in the constructor, it could cause confusion about the field’s intended use. 
- to avoid confusion, such fields should be marked `readonly` to make their intended use explicit, example:
- ```typescript
  class Person {
  private readonly birthYear: number;

    constructor(birthYear: number) {
      this.birthYear = birthYear;
    }
  }
  ```

- `204 No Content`  for `DELETE` is the recommended way to return `DELETE` handler. you shouldn't include a body in it.
- you can define a global `afterHandle` at the app root level with `onAfterHandle`. its the same thing.
- as for the **deployment** and **ci**. i mostly asked for an llm help here.
- [dockerfile](/Dockerfile) explanation:
  - ```dockerfile
    FROM oven/bun:latest      # base image — bun pre-installed
    WORKDIR /app              # working directory inside the container
    COPY package*.json ./     # copy package files first (layer caching)
    RUN bun install           # install dependency
    COPY . .                  # copy source code
    EXPOSE 3000               # document the port
    CMD ["bun", "index.ts"]   # what runs when the container starts
    ```
- you need to understand what the pipeline is actually doing. [ci.yml](./.github/workflows/ci.yml) pipeline explained:
  - ```yml
    jobs:
      test-and-sonar:
        runs-on: ubuntu-latest         # GitHub-hosted Linux runner
        steps:
          - uses: actions/checkout@v4  # pull your code
          - uses: oven-sh/setup-bun@v2 # install Bun
          - run: bun install --frozen-lockfile
          - run: bun test --coverage   # generates lcov.info
          - uses: SonarSource/sonarqube-scan-action@v5
    ```
  - the flow is: **push/pr → github actions runner starts → installs deps → runs tests with coverage → runs sonar scan in the same job.**
  - `sonar-project.properties` stores your `sonar.projectKey` and `sonar.organization` so the workflow stays clean.
  - sonar auth is from `SONAR_TOKEN` in GitHub repository secrets.
  - this means CI and quality gate checks are now entirely handled by GitHub Actions.
  - seriously, i should hand over the explanation to [docker-mastery](https://github.com/tgr-wjya/docker-mastery) for details as its more appropriate there.

## find me

[portfolio](https://tgr-wjya.github.io) · [linkedin](https://linkedin.com/in/tegar-wijaya-kusuma-591a881b9) · [email](mailto:tgr.wjya.queue.top126@pm.me)

---

prev: [elysia-challenge](https://github.com/tgr-wjya/elysia-challenge) · next: [undefined]

made with ◉‿◉