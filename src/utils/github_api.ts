import { Octokit } from "@octokit/rest";


const octokit = new Octokit({
})

export async function asyncFunc() {
    const { data } = await octokit.request("/users/Adam-Alani/repos");
    console.log(data)
    return data;
}



