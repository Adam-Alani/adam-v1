import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
    auth: "8f397710a1cbd288eddbad95492d091b57ee9959",
})

export async function asyncFunc() {
    const { data } = await octokit.request("/users/Adam-Alani/repos");
    console.log(data)
    return data;
}



